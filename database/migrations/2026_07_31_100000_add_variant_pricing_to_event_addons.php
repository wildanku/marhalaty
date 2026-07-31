<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Supersedes D26 in docs/plan/mvp2/8-event-product-integration.md: event addons now carry
 * per-combination pricing (mirrors products/product_variants, max 2 option groups) instead of one
 * flat price for every variant. Applies to manual addons and product-linked addons alike; when
 * linked, `event_addon_variants.price` is copied once from the product's own variant price at
 * link time (admin can override afterward — see EventAddonService).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_addons', function (Blueprint $table) {
            $table->boolean('has_variants')->default(false)->after('stock_source');
            $table->json('options')->nullable()->after('has_variants');
            $table->json('form_fields')->nullable()->after('options');
        });

        // `price` predates has_variants (was always required — flat price only). Mirrors
        // `products.price`, which is nullable for the same reason: null once has_variants=true,
        // real per-combination prices live on event_addon_variants instead.
        DB::statement('ALTER TABLE event_addons ALTER COLUMN price DROP NOT NULL');

        Schema::create('event_addon_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_addon_id')->constrained('event_addons')->cascadeOnDelete();
            // Null for manual addons. Filled for product-linked addons — used by ProductStockService
            // to resolve which product_variants row to reserve against (D31: stock never lives here).
            $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('option1_name');
            $table->string('option1_value');
            $table->string('option2_name')->nullable();
            $table->string('option2_value')->nullable();
            $table->decimal('price', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['event_addon_id', 'option1_value', 'option2_value']);
        });

        $this->backfill();

        Schema::table('event_addons', function (Blueprint $table) {
            $table->dropColumn('variants');
        });
    }

    public function down(): void
    {
        Schema::table('event_addons', function (Blueprint $table) {
            $table->json('variants')->nullable();
        });

        Schema::dropIfExists('event_addon_variants');

        // Best-effort: rolling back loses the per-combination prices being dropped along with
        // event_addon_variants, so there's nothing meaningful to restore `price` to for addons
        // that had none — zero them out so the NOT NULL constraint can come back.
        DB::table('event_addons')->whereNull('price')->update(['price' => 0]);
        DB::statement('ALTER TABLE event_addons ALTER COLUMN price SET NOT NULL');

        Schema::table('event_addons', function (Blueprint $table) {
            $table->dropColumn(['has_variants', 'options', 'form_fields']);
        });
    }

    /**
     * Migrates the old free-typed `variants` JSON (`{"Ukuran": ["M","L"], "forms": [...]}`) into the
     * new shape without changing any buyer-facing price for addons that are already live:
     * - `forms` moves to the new `form_fields` column as-is.
     * - Manual addons with option groups get `options` + one `event_addon_variants` row per
     *   combination, all priced at the addon's current flat `price` (nothing changes for buyers
     *   until an admin edits a specific combination going forward).
     * - Product-linked addons not locked to one variant get the same treatment, one row per the
     *   linked product's active variants — priced at the addon's current flat `price`, deliberately
     *   NOT the product variant's own price, so a live event's charged amount doesn't shift under a
     *   migration.
     * - Addons locked to a single product variant (`event_addons.product_variant_id` set) are left
     *   untouched — that path stays flat-priced, unchanged.
     */
    private function backfill(): void
    {
        $addons = DB::table('event_addons')->get();

        foreach ($addons as $addon) {
            $rawVariants = $addon->variants ? json_decode($addon->variants, true) : null;
            $forms = null;
            $optionGroups = [];

            if (is_array($rawVariants)) {
                foreach ($rawVariants as $key => $value) {
                    if ($key === 'forms') {
                        $forms = $value;

                        continue;
                    }

                    if (is_array($value) && $value !== []) {
                        $optionGroups[$key] = array_values($value);
                    }
                }
            }

            $updates = [];

            if ($forms !== null) {
                $updates['form_fields'] = json_encode($forms);
            }

            $isLocked = $addon->product_variant_id !== null;
            $isLinked = $addon->stock_source === 'product' && $addon->product_id !== null;

            if (! $isLocked && ! $isLinked && count($optionGroups) > 0) {
                $names = array_slice(array_keys($optionGroups), 0, 2);
                $options = array_map(fn ($name) => ['name' => $name, 'values' => $optionGroups[$name]], $names);

                $updates['has_variants'] = true;
                $updates['options'] = json_encode($options);

                foreach ($this->cartesian(array_map(fn ($name) => $optionGroups[$name], $names)) as $combo) {
                    DB::table('event_addon_variants')->insert([
                        'event_addon_id' => $addon->id,
                        'product_variant_id' => null,
                        'option1_name' => $names[0],
                        'option1_value' => $combo[0],
                        'option2_name' => $names[1] ?? null,
                        'option2_value' => $combo[1] ?? null,
                        'price' => $addon->price,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            } elseif (! $isLocked && $isLinked) {
                $product = DB::table('products')->where('id', $addon->product_id)->first();

                if ($product && $product->has_variants) {
                    $updates['has_variants'] = true;
                    $updates['options'] = $product->options;

                    $variants = DB::table('product_variants')
                        ->where('product_id', $addon->product_id)
                        ->where('is_active', true)
                        ->get();

                    foreach ($variants as $variant) {
                        DB::table('event_addon_variants')->insert([
                            'event_addon_id' => $addon->id,
                            'product_variant_id' => $variant->id,
                            'option1_name' => $variant->option1_name,
                            'option1_value' => $variant->option1_value,
                            'option2_name' => $variant->option2_name,
                            'option2_value' => $variant->option2_value,
                            'price' => $addon->price,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            if ($updates !== []) {
                DB::table('event_addons')->where('id', $addon->id)->update($updates);
            }
        }
    }

    /**
     * @param  array<int, array<int, string>>  $arrays
     * @return array<int, array<int, string>>
     */
    private function cartesian(array $arrays): array
    {
        return array_reduce($arrays, function (array $carry, array $items) {
            $result = [];
            foreach ($carry as $combo) {
                foreach ($items as $item) {
                    $result[] = [...$combo, $item];
                }
            }

            return $result;
        }, [[]]);
    }
};
