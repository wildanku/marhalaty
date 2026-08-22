<?php

namespace App\Domains\Store\Policies;

use App\Domains\Store\Models\Store;
use App\Models\User;
use App\Models\Admin;

class StorePolicy
{
    public function view(User|Admin|null $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }
        if ($store->isPubliclyVisible()) {
            return true;
        }

        return $user !== null && $store->isManagedBy($user);
    }

    public function update(User|Admin $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }

        return $store->isManagedBy($user);
    }

    public function manageMembers(User|Admin $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }

        return $store->roleFor($user) === 'owner';
    }

    public function manageProducts(User|Admin $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }

        return $store->isManagedBy($user);
    }

    public function manageOrders(User|Admin $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }

        return $store->isManagedBy($user);
    }

    public function manageShipping(User|Admin $user, Store $store): bool
    {
        if ($user instanceof Admin) {
            return true;
        }

        return $store->isManagedBy($user);
    }
}
