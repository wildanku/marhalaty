<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = AdminActivityLog::with('admin')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return Inertia::render('GodMode/ActivityLogs/Index', [
            'admin' => auth('admin')->user(),
            'logs'  => $logs,
        ]);
    }
}
