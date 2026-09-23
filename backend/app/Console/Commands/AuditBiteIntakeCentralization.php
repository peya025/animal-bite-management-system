<?php

namespace App\Console\Commands;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Queue;
use App\Models\TagoloanTreatmentCard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class AuditBiteIntakeCentralization extends Command
{
    protected $signature = 'bite-intakes:audit-centralization
        {--apply : Apply only deterministic episode-link repairs}
        {--output= : Report path relative to storage/app}';

    protected $description = 'Audit mobile intake, appointment, queue, bite episode, and Form 3 links without inventing clinical data';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $rows = [];

        BiteIncidentIntake::with('appointment')->orderBy('intake_id')->chunkById(200, function ($intakes) use (&$rows, $apply) {
            foreach ($intakes as $intake) {
                $appointmentBiteId = $intake->appointment?->bite_id;
                if (!$intake->appointment_id) {
                    $rows[] = $this->row('intake', $intake->intake_id, 'missing_appointment', 'review', 'No appointment link; not changed.');
                }
                if (!$intake->bite_id && $appointmentBiteId) {
                    if ($apply) {
                        $intake->update(['bite_id' => $appointmentBiteId]);
                    }
                    $rows[] = $this->row('intake', $intake->intake_id, 'missing_bite_link', $apply ? 'repaired' : 'repairable', "Use appointment bite_id {$appointmentBiteId}.");
                } elseif ($intake->bite_id && $appointmentBiteId && (int) $intake->bite_id !== (int) $appointmentBiteId) {
                    $rows[] = $this->row('intake', $intake->intake_id, 'conflicting_bite_link', 'review', 'Intake and appointment reference different episodes.');
                }
            }
        }, 'intake_id');

        Queue::with('appointment')->whereNull('bite_id')->orderBy('queue_id')->chunkById(200, function ($queues) use (&$rows, $apply) {
            foreach ($queues as $queue) {
                $appointmentBiteId = $queue->appointment?->bite_id;
                if ($appointmentBiteId) {
                    if ($apply) {
                        $queue->update(['bite_id' => $appointmentBiteId]);
                    }
                    $rows[] = $this->row('queue', $queue->queue_id, 'missing_bite_link', $apply ? 'repaired' : 'repairable', "Use appointment bite_id {$appointmentBiteId}.");
                } else {
                    $rows[] = $this->row('queue', $queue->queue_id, 'missing_bite_link', 'review', 'No deterministic appointment episode link.');
                }
            }
        }, 'queue_id');

        TagoloanTreatmentCard::whereNull('bite_id')->orderBy('card_id')->chunkById(200, function ($cards) use (&$rows) {
            foreach ($cards as $card) {
                $rows[] = $this->row('treatment_card', $card->card_id, 'missing_bite_link', 'review', 'Clinical episode must be selected by staff; not guessed.');
            }
        }, 'card_id');

        BiteIncident::where(function ($query) {
            $query->whereNull('confirmed_at')
                ->orWhereIn('exposure_type', ['unassessed'])
                ->orWhereIn('severity', ['unassessed']);
        })->orderBy('bite_id')->chunkById(200, function ($incidents) use (&$rows) {
            foreach ($incidents as $incident) {
                $rows[] = $this->row('bite_incident', $incident->bite_id, 'clinical_confirmation_required', 'review', 'Doctor confirmation is required; clinical values were not inferred.');
            }
        }, 'bite_id');

        $report = [
            'generated_at' => now()->toIso8601String(),
            'mode' => $apply ? 'apply-deterministic-links' : 'report-only',
            'summary' => collect($rows)->countBy('status')->all(),
            'items' => $rows,
        ];
        $path = $this->option('output') ?: 'reports/bite-intake-centralization-'.now()->format('Ymd-His').'.json';
        Storage::disk('local')->put($path, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $this->info(($apply ? 'Reconciliation' : 'Audit').' complete: '.count($rows).' item(s).');
        $this->line('Report: storage/app/private/'.$path);

        return self::SUCCESS;
    }

    private function row(string $entity, int $id, string $issue, string $status, string $detail): array
    {
        return compact('entity', 'id', 'issue', 'status', 'detail');
    }
}
