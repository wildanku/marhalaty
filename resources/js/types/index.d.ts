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

// Per-combination pricing (max 2 option groups) — mirrors `ProductVariant`. Addendum to
// docs/plan/mvp2/8-event-product-integration.md, supersedes D26: addons (manual or product-linked)
// now price each combination independently instead of one flat price for every variant.
export interface EventAddonVariant {
  id: number;
  option1_name: string;
  option1_value: string;
  option2_name: string | null;
  option2_value: string | null;
  price: string;
  label: string;
}

export interface EventAddon {
  id: number;
  event_id: number;
  name: string;
  // Flat price — only meaningful when `has_variants` is false. Null when has_variants (mirrors
  // `Product.price`); use `display_price`/`variants` instead.
  price: string | null;
  stock_quantity: number;
  has_variants: boolean;
  form_fields: AddonFormField[] | null;
  // Full per-combination price list — small & bounded (max 2 option groups), safe as an Inertia
  // prop. Empty when `has_variants` is false.
  variants: EventAddonVariant[];
  image_url?: string | null;
  // Fase 8 (docs/plan/mvp2/8-event-product-integration.md) — product-linked addons. All are
  // `$appends` on the EventAddon model, always present once the addon is loaded.
  product_id?: string | null;
  product_variant_id?: string | null;
  is_product_linked: boolean;
  // Buyer-visible stock: for a linked addon this reads the underlying product/variant, never
  // `stock_quantity` (D25) — always prefer this field over `stock_quantity` directly.
  available_stock: number;
  // `{"Ukuran": ["M","L"], ...}` built from `variants` above — same for manual and product-linked
  // addons now. Null when the addon has no variants.
  variant_options: Record<string, string[]> | null;
  // `price` when `!has_variants`, else the lowest active combination price — for "mulai dari"
  // ("starting from") display before a buyer has picked a variant.
  display_price: string;
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
  note?: string | null;
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

export interface PaymentInstruction {
  title: string;
  steps: string[];
}

export interface PaymentDetail {
  type: "virtual_account" | "qris" | string;
  payment_no: string | null;
  payment_name: string | null;
  qr_string: string | null;
  qr_template: string | null;
  amount: number;
  fee: number;
  total: number;
  currency: string;
  expired_at: string | null;
  instructions: PaymentInstruction[];
}

export interface Transaction {
  id: number;
  rsvp_id: number | null;
  payable_type: string | null;
  payable_id: string | null;
  user_id: number;
  amount: string;
  payment_fee: string;
  payment_provider: "manual" | "ipaymu" | "satutera";
  payment_channel: string | null;
  payment_hash: string | null;
  checkout_token: string | null;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  external_reference: string | null;
  payment_url: string | null;
  va_number: string | null;
  payment_detail: PaymentDetail | null;
  paid_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  rsvp?: Rsvp;
  payable?: StoreOrder;
  proof?: PaymentProof | null;
  user?: User;
}

export interface IndonesiaVillage {
  id: string;
  name: string;
  postal_code: string | null;
}

export interface IndonesiaDistrict {
  id: string;
  name: string;
  city?: IndonesiaCity;
}

export interface IndonesiaCity {
  id: string;
  name: string;
  province?: IndonesiaProvince;
}

export interface IndonesiaProvince {
  id: string;
  name: string;
}

export interface StoreAddress {
  id: number;
  store_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  village_id: string;
  postal_code: string;
  lat: string | null;
  lng: string | null;
  rajaongkir_destination_id: number | null;
  is_primary: boolean;
  full_address?: string;
  village?: IndonesiaVillage & { district?: IndonesiaDistrict };
}

export interface StoreMember {
  id: number;
  store_id: string;
  user_id: number;
  role: "owner" | "admin";
  status: "invited" | "active" | "revoked";
  invited_by_user_id: number | null;
  invitation_expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  user?: User;
  store?: Store;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_user_id: number;
  status: "pending" | "approved" | "rejected" | "suspended";
  verified_at: string | null;
  rejection_reason: string | null;
  created_by_admin_id: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  logo_url: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
  owner?: User;
  members?: StoreMember[];
  primary_address?: StoreAddress | null;
  active_products_count?: number;
  active_badges?: StoreBadgeSummary[];
  badges?: StoreBadgeSummary[];
}

export type StoreBadgeColorToken = "primary" | "secondary" | "tertiary" | "error" | "neutral";

export interface StoreBadgeAssignmentPivot {
  id: number;
  assigned_at: string;
  expires_at: string | null;
  note: string | null;
  assigned_by: number | null;
}

export interface StoreBadgeSummary {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  icon: string;
  color_token: StoreBadgeColorToken;
  is_active?: boolean;
  sort_order?: number;
  assignments_count?: number;
  pivot?: StoreBadgeAssignmentPivot;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  option1_name: string;
  option1_value: string;
  option2_name: string | null;
  option2_value: string | null;
  price: string;
  stock_quantity: number;
  weight_grams: number | null;
  is_active: boolean;
  label: string;
  effective_weight: number;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "physical" | "digital";
  sku: string | null;
  status: "draft" | "active" | "archived";
  has_variants: boolean;
  price: string | null;
  stock_quantity: number | null;
  weight_grams: number | null;
  options: ProductOption[] | null;
  display_price: string;
  available_stock: number;
  images: string[];
  primary_image_url: string | null;
  variants?: ProductVariant[];
  store?: Store;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: number;
  user_id: number;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  village_id: string;
  postal_code: string;
  lat: string | null;
  lng: string | null;
  rajaongkir_destination_id: number | null;
  is_default: boolean;
  full_address?: string;
  village?: IndonesiaVillage & { district?: IndonesiaDistrict };
}

export interface FeaturedProduct {
  id: number;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  product?: Product;
}

export interface CartItem {
  id: number;
  cart_id: string;
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  note?: string | null;
  created_at: string;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  user_id: number;
  store_id: string;
  store?: Store;
  items?: CartItem[];
}

export interface CartIssue {
  cart_item_id: number;
  type: string;
  message: string;
}

export interface CartSummary {
  subtotal: number;
  total_weight_grams: number;
  requires_shipping: boolean;
  issues: CartIssue[];
}

export interface ShippingRate {
  courier_code: string;
  courier_name: string;
  service: string;
  description: string | null;
  cost: number;
  etd: string | null;
}

export interface StoreShippingMethod {
  id: string;
  store_id: string;
  name: string;
  type: "pickup" | "flat";
  fee: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentChannel {
  provider: string;
  method: string;
  code: string;
  name: string;
  fee: number;
  fee_type: "FIX" | "PERCENT";
  currency: string;
  image: string | null;
  supports_payment_page: boolean;
  supports_direct_detail: boolean;
  metadata: { instructions?: PaymentInstruction[] };
}

export interface DigitalDelivery {
  id: number;
  store_order_item_id: number;
  media_id: number;
  download_token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
}

export interface StoreOrderItem {
  id: number;
  store_order_id: string;
  product_id: string;
  product_variant_id: string | null;
  name_snapshot: string;
  variant_label_snapshot: string | null;
  note_snapshot: string | null;
  sku_snapshot: string | null;
  type_snapshot: "physical" | "digital";
  unit_price: string;
  quantity: number;
  weight_grams: number;
  subtotal: string;
  digital_deliveries?: DigitalDelivery[];
}

export interface StoreOrderStatusHistory {
  id: number;
  store_order_id: string;
  from_status: string;
  to_status: string;
  reason: string | null;
  actor_type: "store_member" | "admin";
  actor_id: number;
  created_at: string;
}

export interface StoreOrder {
  id: string;
  order_number: string;
  store_id: string;
  buyer_user_id: number;
  status:
    | "pending_payment"
    | "paid"
    | "processing"
    | "shipped"
    | "completed"
    | "cancelled"
    | "expired"
    | "refunded";
  requires_shipping: boolean;
  subtotal: string;
  shipping_cost: string;
  payment_fee: string;
  total: string;
  total_weight_grams: number;
  shipping_provider: string | null;
  shipping_courier_code: string | null;
  shipping_courier_name: string | null;
  shipping_service: string | null;
  shipping_etd: string | null;
  shipping_address_snapshot: Record<string, string | null> | null;
  origin_address_snapshot: Record<string, string | null> | null;
  buyer_note: string | null;
  cancellation_reason: string | null;
  tracking_number: string | null;
  expires_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  stock_released_at: string | null;
  created_at: string;
  store?: Store;
  buyer?: User;
  items?: StoreOrderItem[];
  transactions?: Transaction[];
  status_histories?: StoreOrderStatusHistory[];
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: User | null;
  };
  cart?: { item_count: number } | null;
};
