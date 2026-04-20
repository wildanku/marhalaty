export interface User {
    id: number;
    name: string;
    email: string;
    google_id: string;
    avatar_url: string | null;
    marhalah_year: number;
    phone_number: string | null;
    is_verified: boolean;
    slug: string;
    profession: string | null;
    city: string | null;
    privacy_setting: 'public' | 'circle' | 'private';
    business_showcase_url: string | null;
}

export interface EventAddon {
    id: number;
    event_id: number;
    name: string;
    price: string;
    stock_quantity: number;
    variants: { sizes?: string[] } | null;
}

export interface PricingRules {
    amount?: number;
    options?: number[];
    allow_custom?: boolean;
    min_custom?: number;
}

export interface GontorEvent {
    id: number;
    title: string;
    slug: string;
    description: string;
    location: string;
    event_date: string;
    payment_type: 'free' | 'fixed' | 'flexible';
    pricing_rules: PricingRules;
    visibility_scope: string | null;
    addons?: EventAddon[];
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User | null;
    };
};
