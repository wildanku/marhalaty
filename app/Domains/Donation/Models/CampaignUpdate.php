<?php

namespace App\Domains\Donation\Models;

use Illuminate\Database\Eloquent\Model;

class CampaignUpdate extends Model
{
    protected $fillable = [
        'campaign_id',
        'title',
        'content',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
