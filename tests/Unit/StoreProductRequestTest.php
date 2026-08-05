<?php

namespace Tests\Unit;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Requests\StoreProductRequest;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class StoreProductRequestTest extends TestCase
{
    public function test_physical_variant_product_validates_weights_on_variants_only(): void
    {
        $request = $this->makeRequest([
            'has_variants' => '1',
            'weight_grams' => '',
            'options' => [['name' => 'Size', 'values' => ['M']]],
            'variants' => [[
                'option1_value' => 'M',
                'option2_value' => '',
                'price' => '60000',
                'stock_quantity' => '100',
                'weight_grams' => '100',
                'sku' => '',
            ]],
        ]);

        $validator = Validator::make(
            $request->all(),
            $request->rules(),
        );

        $this->assertFalse($validator->fails(), $validator->errors()->toJson());
    }

    public function test_physical_product_without_variants_requires_parent_weight(): void
    {
        $request = $this->makeRequest([
            'has_variants' => '0',
            'weight_grams' => '',
        ]);

        $validator = Validator::make($request->all(), $request->rules());

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('weight_grams', $validator->errors()->toArray());
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeRequest(array $overrides): StoreProductRequest
    {
        $request = StoreProductRequest::create('/', 'POST', array_replace([
            'name' => 'Kaos Reuni',
            'description' => '<p>Deskripsi</p>',
            'type' => 'physical',
            'sku' => '',
            'status' => 'active',
            'has_variants' => '0',
            'price' => '12000',
            'stock_quantity' => '100',
            'weight_grams' => '100',
            'options' => [],
            'variants' => [],
        ], $overrides));

        $route = new Route('POST', '/', static fn (): null => null);
        $route->bind($request);
        $route->setParameter('store', (new Store)->setAttribute('id', 'store-test'));
        $request->setRouteResolver(static fn (): Route => $route);

        return $request;
    }
}
