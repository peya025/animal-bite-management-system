<?php

namespace App\Console\Commands;

use App\Services\CommunityAwareness\AdvisoryWorkflowService;
use Illuminate\Console\Command;

class PublishScheduledAdvisories extends Command
{
    protected $signature = 'advisories:publish-scheduled';
    protected $description = 'Publish due approved community advisories after revalidating approval and release gates.';

    public function handle(AdvisoryWorkflowService $workflow): int
    {
        $result = $workflow->publishDueScheduled();
        $this->info(sprintf(
            'Scheduled advisories processed: %d published, %d cancelled, %d skipped.',
            $result['published'],
            $result['cancelled'],
            $result['skipped']
        ));
        return self::SUCCESS;
    }
}
