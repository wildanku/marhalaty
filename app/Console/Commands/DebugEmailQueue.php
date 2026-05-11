<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DebugEmailQueue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:email-queue';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Debug email queue - check for pending jobs and queue worker status';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Email Queue Debug ===');
        $this->newLine();

        // Check queue configuration
        $queueDriver = config('queue.default');
        $this->info("Queue Driver: {$queueDriver}");

        if ($queueDriver === 'database') {
            $this->debugDatabaseQueue();
        } elseif ($queueDriver === 'redis') {
            $this->debugRedisQueue();
        } elseif ($queueDriver === 'sync') {
            $this->info('✓ Queue driver is SYNC (emails sent immediately)');
        } else {
            $this->warn("Queue driver '{$queueDriver}' is not commonly used for email");
        }

        $this->newLine();
        $this->info('=== Mail Configuration ===');
        $this->info('Mailer: ' . config('mail.default'));
        $this->info('Host: ' . config('mail.mailers.smtp.host'));
        $this->info('Port: ' . config('mail.mailers.smtp.port'));
        $this->info('From: ' . config('mail.from.address'));
    }

    private function debugDatabaseQueue(): void
    {
        $jobsTable = config('queue.connections.database.table', 'jobs');
        
        $this->warn('⚠️  Queue driver is DATABASE');
        $this->newLine();

        // Count jobs
        $totalJobs = DB::table($jobsTable)->count();
        $this->info("Total pending jobs: {$totalJobs}");

        if ($totalJobs > 0) {
            $this->error("❌ WARNING: {$totalJobs} jobs stuck in queue!");
            $this->newLine();
            $this->warn('To process them, run: php artisan queue:work');
            $this->newLine();

            // Show oldest jobs
            $oldestJobs = DB::table($jobsTable)
                ->orderBy('created_at')
                ->limit(5)
                ->get(['id', 'queue', 'payload', 'created_at', 'attempts']);

            if ($oldestJobs->count() > 0) {
                $this->table(
                    ['ID', 'Queue', 'Created', 'Attempts'],
                    $oldestJobs->map(fn($job) => [
                        $job->id,
                        $job->queue,
                        $job->created_at,
                        $job->attempts,
                    ])->toArray()
                );
            }
        } else {
            $this->info('✓ No pending jobs');
        }

        $this->newLine();
        $this->info('Recommendations:');
        $this->line('1. Set QUEUE_CONNECTION=sync in .env for immediate email sending');
        $this->line('   OR');
        $this->line('2. Run queue worker: php artisan queue:work --timeout=60');
        $this->line('   OR');
        $this->line('3. Run supervisor to keep queue worker alive');
    }

    private function debugRedisQueue(): void
    {
        $this->warn('⚠️  Queue driver is REDIS');
        $this->info('To debug Redis queue, use: redis-cli KEYS "queues:*"');
        $this->newLine();
        $this->info('Recommendations:');
        $this->line('1. Set QUEUE_CONNECTION=sync in .env for immediate email sending');
        $this->line('   OR');
        $this->line('2. Ensure Redis is running and queue worker is active');
        $this->line('   php artisan queue:work redis --timeout=60');
    }
}
