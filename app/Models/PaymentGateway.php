<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    protected $fillable = [
        'code',
        'label',
        'description',
        'is_enabled',
        'contexts',
        'credentials',
        'options',
        'last_verified_at',
        'sort_order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'contexts' => 'array',
        // Encrypted at rest — never serialize this to Inertia/JSON. PaymentSettingsService is the
        // only thing that should ever read it.
        'credentials' => 'encrypted:array',
        'options' => 'array',
        'last_verified_at' => 'datetime',
        'sort_order' => 'integer',
    ];

    protected $hidden = [
        'credentials',
    ];

    public function supportsContext(string $context): bool
    {
        return in_array($context, config("payments.drivers.{$this->code}.contexts", []), true);
    }
}
