<?php

namespace Tests\Integration;

use App\Events\AppointmentStatusChanged;
use App\Events\QueueTicketUpdated;
use App\Events\StaffNotificationBroadcast;
use App\Events\VaccineStockUpdated;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ReverbTransportTest extends TestCase
{
    private function readBytes($socket, int $length): string
    {
        $data = '';
        while (strlen($data) < $length) {
            $chunk = fread($socket, $length - strlen($data));
            $this->assertNotFalse($chunk);
            $this->assertNotSame('', $chunk, 'WebSocket closed or timed out');
            $data .= $chunk;
        }
        return $data;
    }

    private function receive($socket): array
    {
        $header = $this->readBytes($socket, 2);
        $length = ord($header[1]) & 127;
        if ($length === 126) {
            $length = unpack('n', $this->readBytes($socket, 2))[1];
        }
        $this->assertLessThan(65536, $length);
        $this->assertNotSame(127, ord($header[1]) & 127);
        return json_decode($this->readBytes($socket, $length), true, flags: JSON_THROW_ON_ERROR);
    }

    private function send($socket, array $message): void
    {
        $data = json_encode($message, JSON_THROW_ON_ERROR);
        $mask = random_bytes(4);
        $length = strlen($data);
        $frame = chr(129).($length < 126 ? chr(128 | $length) : chr(254).pack('n', $length)).$mask;
        for ($i = 0; $i < $length; $i++) {
            $frame .= $data[$i] ^ $mask[$i % 4];
        }
        fwrite($socket, $frame);
    }

    public function test_real_reverb_receives_only_broadcast_queue_jobs_and_immediate_queue_event(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
        Schema::create('jobs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        $listener = stream_socket_server('tcp://127.0.0.1:0');
        $this->assertNotFalse($listener);
        $port = (int) substr(strrchr(stream_socket_get_name($listener, false), ':'), 1);
        fclose($listener);
        $process = new Process([PHP_BINARY, 'artisan', 'reverb:start', '--host=127.0.0.1', '--port='.$port], base_path(), [
            'APP_ENV' => 'testing', 'APP_CONFIG_CACHE' => sys_get_temp_dir().'/abtc-reverb-no-cache-'.getmypid(),
            'REVERB_APP_ID' => 'audit', 'REVERB_APP_KEY' => 'audit-key', 'REVERB_APP_SECRET' => 'audit-secret',
            'REVERB_HOST' => '127.0.0.1', 'REVERB_PORT' => (string) $port, 'REVERB_SCHEME' => 'http',
            'REVERB_ALLOWED_ORIGINS' => '*', 'REVERB_SCALING_ENABLED' => 'false',
        ]);
        $socket = false;
        try {
            $process->start();
            $deadline = microtime(true) + 10;
            do {
                $socket = @stream_socket_client('tcp://127.0.0.1:'.$port, $errno, $errstr, 0.2);
                if ($socket) { break; }
                usleep(100000);
            } while (microtime(true) < $deadline && $process->isRunning());
            $this->assertNotFalse($socket, 'Local Reverb failed to start');
            stream_set_timeout($socket, 5);
            $nonce = base64_encode(random_bytes(16));
            fwrite($socket, "GET /app/audit-key?protocol=7&client=audit&version=1 HTTP/1.1\r\nHost: 127.0.0.1:$port\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: $nonce\r\nSec-WebSocket-Version: 13\r\n\r\n");
            $this->assertStringContainsString('101', fgets($socket));
            while (($line = fgets($socket)) !== false && trim($line) !== '') {}
            $connected = $this->receive($socket);
            $this->assertSame('pusher:connection_established', $connected['event']);
            $socketId = json_decode($connected['data'], true)['socket_id'];

            foreach (['private-clinic.1.queue', 'private-clinic.1.notifications', 'private-clinic.1.inventory'] as $channel) {
                $this->send($socket, ['event' => 'pusher:subscribe', 'data' => [
                    'channel' => $channel,
                    'auth' => 'audit-key:'.hash_hmac('sha256', $socketId.':'.$channel, 'audit-secret'),
                ]]);
                $this->assertSame('pusher_internal:subscription_succeeded', $this->receive($socket)['event']);
            }

            config([
                'queue.default' => 'database', 'broadcasting.default' => 'reverb',
                'broadcasting.connections.reverb' => [
                    'driver' => 'reverb', 'key' => 'audit-key', 'secret' => 'audit-secret', 'app_id' => 'audit',
                    'options' => ['host' => '127.0.0.1', 'port' => $port, 'scheme' => 'http', 'useTLS' => false],
                ],
            ]);
            $queue = app('queue')->connection('database');
            // Sentinels must remain unreserved; they are never executable jobs.
            foreach (['notifications', 'default'] as $name) {
                $queue->pushRaw('{}', $name);
            }
            $events = [
                new AppointmentStatusChanged(1, 1, 'scheduled'),
                new StaffNotificationBroadcast(1, 1, 'general', 'info', 'Synthetic audit', 'Synthetic audit'),
                new VaccineStockUpdated(1, 1, 'Synthetic', 'Synthetic', 1),
            ];
            foreach ($events as $event) {
                event($event);
                $this->assertSame(1, DB::table('jobs')->where('queue', 'broadcasts')->count());
                Artisan::call('queue:work', ['connection' => 'database', '--queue' => 'broadcasts', '--once' => true, '--sleep' => 0, '--tries' => 1]);
                $received = $this->receive($socket);
                $this->assertSame($event->broadcastAs(), $received['event']);
                $this->assertEquals($event->broadcastWith(), json_decode($received['data'], true));
                $this->assertSame(0, DB::table('jobs')->where('queue', 'broadcasts')->count());
            }
            $immediate = new QueueTicketUpdated(1, 1, 1, 'waiting');
            event($immediate);
            $this->assertSame('queue.updated', $this->receive($socket)['event']);
            $this->assertSame(2, DB::table('jobs')->whereIn('queue', ['notifications', 'default'])->whereNull('reserved_at')->where('attempts', 0)->count());
        } finally {
            if (is_resource($socket)) { fclose($socket); }
            $process->stop();
            Schema::dropIfExists('jobs');
        }
    }
}
