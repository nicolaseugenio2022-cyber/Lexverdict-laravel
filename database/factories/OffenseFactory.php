<?php

namespace Database\Factories;

use App\Models\Offense;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Offense>
 */
class OffenseFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => $name,
            'normalized_name' => mb_strtolower($name),
            'law_reference' => fake()->optional()->bothify('Article ###'),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
