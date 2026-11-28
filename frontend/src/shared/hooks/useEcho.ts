import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createEchoClient,
  disconnectEcho,
  getEcho,
  isEchoConnected,
  subscribeToEchoStatus,
  type EchoConnectionStatus,
} from '../services/echo';

export interface QueueUpdatedPayload {
  queue_id: number;
  queue_number: number;
  status: string;
  action: string;
  station_id: number | null;
  station_name: string | null;
  call_count: number;
  lane: string | null;
  timestamp: string;
}

export interface AppointmentChangedPayload {
  appointment_id: number;
  clinic_id: number;
  status: string;
  action: string;
  appointment_date: string | null;
  appointment_time: string | null;
  dose_number: number | null;
  queue_number: number | null;
  patient_account_id: number | null;
  timestamp: string;
}

export interface NotificationBroadcastPayload {
  notification_id: number;
  clinic_id: number;
  category: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  user_id?: number | null;
  role?: string | null;
  created_at: string;
}

export interface InventoryUpdatedPayload {
  inventory_id: number;
  clinic_id: number;
  vaccine_type: string;
  batch_number: string;
  current_quantity: number;
  open_vial_status: string | null;
  open_vial_doses_used: number;
  open_vial_discard_at: string | null;
  action: string;
  timestamp: string;
}

export function useEcho() {
  const { user, token, clinic } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<EchoConnectionStatus>(() =>
    isEchoConnected() ? 'connected' : 'disconnected'
  );

  const echoRef = useRef<any>(null);

  // Initialize or connect Echo whenever token is valid
  useEffect(() => {
    if (!token || !user) {
      if (echoRef.current) {
        disconnectEcho();
        echoRef.current = null;
      }
      return;
    }

    const client = createEchoClient(token);
    echoRef.current = client;

    const unsubscribe = subscribeToEchoStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, [token, user]);

  const clinicId = clinic?.id ?? user?.clinic_id ?? null;

  return {
    echo: echoRef.current || getEcho(),
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    clinicId,
    user,
  };
}
