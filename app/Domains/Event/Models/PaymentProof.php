<?php

namespace App\Domains\Event\Models;

use App\Models\Admin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProof extends Model
{
    protected $fillable = [
        'transaction_id',
        'file_path',
        'original_name',
        'notes',
        'reviewed_at',
        'reviewed_by',
        'review_note',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    public function isReviewed(): bool
    {
        return $this->reviewed_at !== null;
    }
}
