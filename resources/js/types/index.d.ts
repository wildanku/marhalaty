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
  profession_id: number | null;
  profession: string | { id: number; name: string } | null;
  country: string | null;
  city_id: string | null;
  city: string | { id: string; name: string; province?: { name: string } } | null;
  foreign_city: string | null;
  campus_id: number | null;
  campus: { id: number; name: string } | null;
  social_media: { instagram?: string; tiktok?: string; linkedin?: string } | null;
  metadata: Record<string, unknown> | null;
  privacy_setting: "public" | "circle" | "private";
  business_showcase_url: string | null;
}

export interface EventAddon {
  id: number;
  event_id: number;
  name: string;
  price: string;
  stock_quantity: number;
  variants: Record<string, string[]> | null;
}

export interface EventPackage {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  price: string;
  stock_quantity: number | null;
}

export interface InfakRules {
  enabled: boolean;
  options?: number[];
  allow_custom?: boolean;
  min_custom?: number;
  currency?: string;
  description?: string;
}

export interface CustomFormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface GontorEvent {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string;
  event_date: string;
  infak_rules: InfakRules | null;
  visibility_scope: string | null;
  metadata: {
    custom_forms?: CustomFormField[];
    [key: string]: unknown;
  } | null;
  addons?: EventAddon[];
  packages?: EventPackage[];
}

export interface RsvpAddonSnapshot {
  id: number;
  name: string;
  price: number;
  quantity: number;
  variants: Record<string, string> | null;
  total: number;
}

export interface Rsvp {
  id: number;
  event_id: number;
  user_id: number;
  event_package_id: number | null;
  package_amount: string;
  infak_amount: string;
  total_amount: string;
  status: "pending" | "paid" | "expired" | "failed";
  add_ons_snapshot: RsvpAddonSnapshot[] | null;
  custom_form_data: Record<string, string> | null;
  qr_code_path: string | null;
  created_at: string;
  updated_at: string;
  event?: GontorEvent;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: User | null;
  };
};
