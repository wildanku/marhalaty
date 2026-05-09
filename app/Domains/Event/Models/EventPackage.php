<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'description',
        'price',
        'stock_quantity',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock_quantity' => 'integer',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Merchandise/addons bundled into this package.
     * The pivot stores the included_quantity for each bundled item.
     */
    public function includedAddons()
    {
        return $this->belongsToMany(
            EventAddon::class,
            'event_package_included_addons',
            'event_package_id',
            'event_addon_id'
        )->withPivot('included_quantity')->withTimestamps();
    }
}
