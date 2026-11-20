import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './api';

// Make Pusher globally accessible for Laravel Echo
declare global {
  interface Window {
    Pusher: any;
    Echo?: any;
  }
}

window.Pusher = Pusher;

export type EchoConnectionStatus =
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable'
  | 'failed';

let echoInstance: any = null;
let currentTokenRef: string | null = null;
let currentStatus: EchoConnectionStatus = 'disconnected';
const statusListeners = new Set<(status: EchoConnectionStatus) => void>();

/**
 * Determine the broadcasting auth endpoint URL from Vite environment variables.
 */
export const getBroadcastingAuthEndpoint = (): string => {
  const apiBase = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000/api'
  ).replace(/\/+$/, '');

  return apiBase.endsWith('/api')
    ? `${apiBase}/broadcasting/auth`
    : `${apiBase}/api/broadcasting/auth`;
};

/**
 * Notify all registered connection status listeners.
 */
const notifyStatus = (status: EchoConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // Ignore listener error
    }
  });
};

/**
 * Subscribe to WebSocket connection status changes.
 */
export const subscribeToEchoStatus = (
  listener: (status: EchoConnectionStatus) => void
): (() => void) => {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
};

/**
 * Check if the Echo WebSocket client is currently connected.
 */
export const isEchoConnected = (): boolean => {
  return currentStatus === 'connected';
};

/**
 * Create or retrieve the singleton Echo client instance.
 *
 * @param authToken Sanctum bearer token for private channel authorization
 */
export const createEchoClient = (authToken?: string | null): any => {
  const token = authToken || localStorage.getItem('authToken');
  const appKey = import.meta.env.VITE_REVERB_APP_KEY || 'abtc-reverb-key-2026';
  const wsHost = import.meta.env.VITE_REVERB_HOST || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1') || '127.0.0.1';
  
  // Production HTTPS/WSS enforcement: avoid browser mixed-content security errors
  const isHttpsPage = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const rawScheme = (import.meta.env.VITE_REVERB_SCHEME || '').toLowerCase().trim();
  const forceTLS = rawScheme === 'https' || rawScheme === 'wss' || (!rawScheme && isHttpsPage);

  const defaultPort = forceTLS ? 443 : 8080;
  const resolvedPort = import.meta.env.VITE_REVERB_PORT
    ? Number(import.meta.env.VITE_REVERB_PORT)
    : defaultPort;
  const wsPort = resolvedPort;
  const wssPort = resolvedPort;

  // If instance already exists with the same token, return existing instance
  if (echoInstance && currentTokenRef === token) {
    return echoInstance;
  }

  // If token changed or previous instance exists, disconnect previous
  if (echoInstance) {
    disconnectEcho();
  }

  currentTokenRef = token || null;

  try {
    echoInstance = new Echo({
      broadcaster: 'reverb',
      Pusher: Pusher,
      key: appKey,
      wsHost,
      wsPort,
      wssPort,
      forceTLS,
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: { name: string }) => {
        return {
          authorize: (socketId: string, callback: (error: any, authData: any) => void) => {
            const activeToken = token || localStorage.getItem('authToken');
            if (!activeToken) {
              return callback(new Error('Unauthenticated for broadcast channel'), null);
            }

            const authEndpoint = getBroadcastingAuthEndpoint();

            api.post(authEndpoint, {
              socket_id: socketId,
              channel_name: channel.name,
            }, {
              headers: {
                Authorization: `Bearer ${activeToken}`,
                Accept: 'application/json',
              },
            })
              .then((response) => {
                callback(null, response.data);
              })
              .catch((error) => {
                const status = error?.response?.status;
                if (status === 403 || status === 401) {
                  console.warn(`[Echo] Channel authorization rejected (${status}) for: ${channel.name}`);
                } else {
                  console.warn(`[Echo] Channel authorization network error for: ${channel.name}`);
                }
                callback(error, null);
              });
          },
        };
      },
    });

    // Attach connection lifecycle handlers
    const pusherClient = echoInstance.connector?.pusher;
    if (pusherClient?.connection) {
      pusherClient.connection.bind('state_change', (states: { current: string; previous: string }) => {
        const nextState = states.current as EchoConnectionStatus;
        notifyStatus(nextState);
      });

      pusherClient.connection.bind('error', (err: any) => {
        console.warn('[Echo] WebSocket connection warning:', err?.error?.data?.message || err?.type || 'Connection issue');
        notifyStatus('failed');
      });

      // Seed initial state
      notifyStatus((pusherClient.connection.state as EchoConnectionStatus) || 'connecting');
    }

    window.Echo = echoInstance;
  } catch (err) {
    console.warn('[Echo] Initialization warning:', err);
    notifyStatus('failed');
  }

  return echoInstance!;
};

/**
 * Retrieve the current Echo instance (or null if not initialized).
 */
export const getEcho = (): any => {
  return echoInstance;
};

/**
 * Disconnect and purge the singleton Echo instance, unsubscribing from all channels.
 */
export const disconnectEcho = (): void => {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      // Ignore disconnect error
    }
    echoInstance = null;
    delete window.Echo;
  }
  currentTokenRef = null;
  notifyStatus('disconnected');
};

/**
 * Leave a specific channel without tearing down the entire connection.
 */
export const leaveChannel = (channelName: string): void => {
  if (echoInstance) {
    try {
      echoInstance.leave(channelName);
    } catch {
      // Ignore
    }
  }
};
