<?php

namespace App\Support\Eloquent;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Forces every `morphMany()` relation on the model (in practice: Spatie MediaLibrary's `media()`)
 * to eager-load via `whereIn()` rather than Eloquent's default `whereIntegerInRaw()`.
 *
 * `media.model_id` was widened to `varchar` in
 * `2026_07_29_090600_change_media_model_id_to_string.php` so the same polymorphic column could
 * also hold ULID keys (Store, Product). For a bigint-keyed parent (this model), Eloquent's default
 * `whereInMethod()` picks `whereIntegerInRaw()` — which inlines the parent's own id as a raw,
 * untyped SQL integer literal instead of a bound parameter. Postgres then rejects comparing that
 * literal against a `varchar` column ("operator does not exist: character varying = integer");
 * MySQL/SQLite silently coerce the same comparison, which is why this only ever surfaces here.
 *
 * This does NOT touch `$keyType` or attribute casting — `id` keeps serializing as a JSON number
 * everywhere else in the app. Only this relation's query-building strategy changes.
 */
trait HasTypeSafeMorphMany
{
    protected function newMorphMany(Builder $query, Model $parent, $type, $id, $localKey)
    {
        return new TypeSafeMorphMany($query, $parent, $type, $id, $localKey);
    }
}
