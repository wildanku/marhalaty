<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MonitorEmailQueue extends Command
{
    protected $signature = 'queue:monitor-emails {--interval=5}';
    protected $description = 'Monitor email queue health and display real-time statistics';

    public function handle()
    {
        $interval = $this->option('interval');

        $this->info("Email Queue Monitor (updating every {$interval}s)");
        $this->info("Press Ctrl+C to stop");

        while (true) {
            $this->displayMetrics();
            sleep($interval);
            $this->line(str_repeat('-', 80));
        }
    }

    private function displayMetrics(): void
    {
        // Queue config
        $queueDriver = config('queue.default');
        $this->line("Queue Driver: <fg=cyan>{$queueDriver}</>");

        if ($queueDriver !== 'database') {
            $this->line('<fg=yellow>[Warning] Non-database queue detected. Cannot monitor.</>');
            return;
        }

        try {
            // Get queue statistics
            $jobsTable = config('queue.connections.database.table', 'jobs');
            
            $pendingCount = DB::table($jobsTable)->count();
            $this->line("<fg=blue>Pending Jobs:</> {$pendingCount}");

            // Failed jobs count
            $failedCount = DB::table('failed_jobs')->count();
            $status = $failedCount > 0 ? '<fg=red>' : '<fg=green>';
            $this->line("{$status}Failed Jobs:</> {$failedCount}");

            // Check for very old jobs using raw SQL (created_at is stored as integer timestamp)
            $stuckJobs = DB::select(
                "SELECT COUNT(*) as count FROM \"jobs\" WHERE created_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::integer"
            );
            $stuckCount = $stuckJobs[0]->count ?? 0;

            if ($stuckCount > 0) {
                $this->line("<fg=red>[ERROR] STUCK JOBS (>1hr):</> {$stuckCount}");
            } else {
                $this->line("<fg=green>[OK] No stuck jobs</>");
            }

            // Queue worker status
            $workerRunning = $this->checkQueueWorker();
            if ($workerRunning) {
                $this->line('<fg=green>[OK] Queue Worker:</> Running');
            } else {
                $this->line('<fg=red>[ERROR] Queue Worker:</> NOT RUNNING');
            }

            // Recommendations
            if ($stuckCount > 0) {
                $this->line("\n<fg=red>[WARNING] Action Required:</>");
                $this->line('  1. Check queue worker: sudo supervisorctl status laravel-worker');
                $this->line('  2. View logs: tail -f /var/log/laravel-worker.log');
                $this->line('  3. Restart worker: sudo supervisorctl restart laravel-worker:*');
            }
        } catch (\Exception $e) {
            $this->line("<fg=red>[ERROR] Database error: {$e->getMessage()}</>");
        }
    }

    private function checkQueueWorker(): bool
    {
        if (config('queue.default') !== 'database') {
            return true;
        }

        try {
            // If queue table is empty or jobs are recent, assume worker is running
            // created_at is stored as integer timestamp
            $result = DB::select(
                "SELECT COUNT(*) as count FROM \"jobs\" WHERE created_at >= EXTRACT(EPOCH FROM NOW() - INTERVAL '5 minutes')::integer"
            );
            $recentCount = $result[0]->count ?? 0;
            
            return $recentCount > 0 || (DB::table('jobs')->count() === 0);
        } catch (\Exception $e) {
            return false;
        }
    }
}
