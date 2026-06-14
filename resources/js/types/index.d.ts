export interface User {
  id: number;
  name: string;
  email: string;
  google_id: string;
  avatar_url: string | null;
  marhalah_year: number;
  no_stambuk: string | null;
  pendidikan_terakhir_id: number | null;
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
  pendidikanTerakhir?: { id: number; name: string } | null;
  social_media: { instagram?: string; tiktok?: string; linkedin?: string } | null;
  metadata: Record<string, unknown> | null;
  privacy_setting: "public" | "circle" | "private";
  business_showcase_url: string | null;
}

export interface AddonFormField {
  label: string;
  key: string;
  type: "text" | "email" | "number" | "select" | "textarea";
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface EventAddon {
  id: number;
  event_id: number;
  name: string;
  price: string;
  stock_quantity: number;
  variants: Record<string, string[] | AddonFormField[]> | null;
  image_url?: string | null;
}

export interface IncludedAddon extends EventAddon {
  pivot: {
    included_quantity: number;
  };
}

export interface EventPackage {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  price: string;
  quota: number | null;
  booked_count: number;
  available_quota: number | null;
  is_available: boolean;
  included_addons?: IncludedAddon[];
  image_url?: string | null;
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
  id?: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "number" | "radio-grid-6";
  required: boolean;
  placeholder?: string;
  options?: string[];
  default?: string;
}

export interface GontorEvent {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string;
  event_date: string;
  is_registration_enabled?: boolean;
  infak_rules: InfakRules | null;
  visibility_scope: string | null;
  metadata: {
    custom_forms?: CustomFormField[];
    package_description?: string;
    addon_description?: string;
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
  variant_slots?: Record<string, string | string[]> | null;
  form?: Record<string, any> | null;
  total: number;
}

export interface Rsvp {
  id: number;
  event_id: number;
  user_id: number | null;
  event_package_id: number | null;
  package_amount: string;
  infak_amount: string;
  total_amount: string;
  status: "pending" | "paid" | "expired" | "failed";
  add_ons_snapshot: RsvpAddonSnapshot[] | null;
  custom_form_data: Record<string, string> | null;
  qr_code_path: string | null;
  is_manual_entry?: boolean;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_country?: string | null;
  guest_city_id?: string | null;
  guest_foreign_city?: string | null;
  manual_entry_note?: string | null;
  created_at: string;
  updated_at: string;
  event?: GontorEvent;
  latest_transaction?: Transaction | null;
}

export interface PaymentProof {
  id: number;
  transaction_id: number;
  file_path: string;
  original_name: string;
  notes: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  rsvp_id: number;
  user_id: number;
  amount: string;
  payment_provider: "manual" | "ipaymu";
  payment_channel: string | null;
  payment_hash: string | null;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  external_reference: string | null;
  payment_url: string | null;
  va_number: string | null;
  paid_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  rsvp?: Rsvp;
  proof?: PaymentProof | null;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: User | null;
  };
};
