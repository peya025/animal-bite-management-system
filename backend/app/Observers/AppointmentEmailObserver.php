<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Services\Messaging\AppointmentEmailEvents;
use Illuminate\Support\Facades\Log;

class AppointmentEmailObserver
{
    public function created(Appointment $appointment): void
    {
        if ($appointment->status === 'scheduled') {
            $this->record($appointment, 'scheduled');
        }
    }

    public function updated(Appointment $appointment): void
    {
        if ($appointment->wasChanged('status') && $appointment->status === 'cancelled') {
            $this->record($appointment, 'cancelled');
        } elseif ($appointment->status === 'scheduled' && $appointment->wasChanged(['scheduled_date', 'appointment_date', 'appointment_time'])) {
            $this->record($appointment, 'rescheduled');
        } elseif ($appointment->wasChanged('status') && $appointment->status === 'confirmed') {
            $this->record($appointment, 'confirmed');
        }
    }

    private function record(Appointment $appointment, string $event): void
    {
        try {
            app(AppointmentEmailEvents::class)->record($appointment, $event);
        } catch (\Throwable $e) {
            Log::error('Appointment email could not be queued.', ['exception' => get_class($e)]);
        }
    }
}
