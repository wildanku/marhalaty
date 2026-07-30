<?php

namespace App\Domains\Store\Policies;

use App\Domains\Store\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function view(?User $user, Store $store): bool
    {
        if ($store->isPubliclyVisible()) {
            return true;
        }

        return $user !== null && $store->isManagedBy($user);
    }

    public function update(User $user, Store $store): bool
    {
        return $store->isManagedBy($user);
    }

    public function manageMembers(User $user, Store $store): bool
    {
        return $store->roleFor($user) === 'owner';
    }

    public function manageProducts(User $user, Store $store): bool
    {
        return $store->isManagedBy($user);
    }

    public function manageOrders(User $user, Store $store): bool
    {
        return $store->isManagedBy($user);
    }
}
