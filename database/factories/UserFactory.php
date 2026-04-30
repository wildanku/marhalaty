<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     */

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'google_id' => fake()->unique()->uuid(),
            'avatar_url' => fake()->imageUrl(),
            'marhalah_year' => 2024,
            'phone_number' => fake()->phoneNumber(),
            'is_verified' => true,
            'remember_token' => Str::random(10),
        ];
    }
}
