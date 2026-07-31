<?php

namespace App\Support\Eloquent;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Identical to Laravel's MorphMany, except eager-loading always builds its constraint via
 * `whereIn()` rather than `whereIntegerInRaw()`. See `HasTypeSafeMorphMany` for why this exists.
 */
class TypeSafeMorphMany extends MorphMany
{
    protected function whereInMethod(Model $model, $key)
    {
        return 'whereIn';
    }
}
