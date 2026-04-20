<?php

namespace App\Domains\Donation\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Donation\Models\Campaign;
use App\Domains\Donation\Models\Fund;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CampaignController extends Controller
{
    public function index()
    {
        $funds = Fund::all();
        $campaigns = Campaign::where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Donation/Index', [
            'funds' => $funds,
            'campaigns' => $campaigns
        ]);
    }

    public function show($slug)
    {
        $campaign = Campaign::with('updates')->where('slug', $slug)->firstOrFail();
        
        $recentDonations = $campaign->donations()
            ->with(['user' => function($q) {
                // Select only specific fields to avoid leaking sensitive data like email/password
                $q->select('id', 'name', 'avatar_url', 'marhalah_year');
            }])
            ->where('status', 'paid')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($donation) {
                // Anonymous Masking - Replace user name dynamically
                if ($donation->is_anonymous && $donation->user) {
                     $donation->user->name = "Hamba Allah";
                     $donation->user->avatar_url = null; // Blank out avatar
                }
                return $donation;
            });

        return Inertia::render('Donation/Show', [
            'campaign' => $campaign,
            'recentDonations' => $recentDonations
        ]);
    }
}
