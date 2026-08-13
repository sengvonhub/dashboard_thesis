/** Transcribed from app/schemas/quotation_Schema.py. */

export type QuotationStatus = "draft" | "sent" | "accepted";
export type ArtworkStatus = "not_provided" | "approved" | "needs_revision";
export type DeliveryMethod = "pickup" | "delivery";

// ── price tiers ──────────────────────────────────────────
export interface PriceTierCreate {
  quantity: number;
  unit_price: number;
  sort_order?: number;
}

export interface PriceTierResponse {
  tier_id: number;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  sort_order: number;
}

// ── items ────────────────────────────────────────────────
export interface QuotationItemCreate {
  sort_order: number;
  item_name: string;
  size?: string | null;
  pages?: number | null;
  print_side?: string | null;
  color_spec?: string | null;
  paper_cover?: string | null;
  paper_inside?: string | null;
  finishing?: string | null;
  language?: string | null;
  quantity: number;
  unit_price: number;
  note?: string | null;
  price_tiers?: PriceTierCreate[] | null;
}

export type QuotationItemUpdate = Partial<QuotationItemCreate>;

export interface QuotationItemResponse {
  item_id: number;
  company_id: number;
  quotation_id?: number | null;
  sort_order: number;
  item_name: string;
  size?: string | null;
  pages?: number | null;
  print_side?: string | null;
  color_spec?: string | null;
  paper_cover?: string | null;
  paper_inside?: string | null;
  finishing?: string | null;
  language?: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  note?: string | null;
  price_tiers: PriceTierResponse[];
}

// ── quotation ────────────────────────────────────────────
export interface QuotationCreate {
  customer_id?: number | null;
  staff_id?: number | null;
  ref_number: string;
  quotation_date: string; // YYYY-MM-DD
  expiry_date?: string | null;
  production_days?: number | null;
  artwork_status?: ArtworkStatus | null;
  payment_terms?: string | null;
  delivery_method?: DeliveryMethod | null;
  discount?: number;
  tax?: number;
  note?: string | null;
  items?: QuotationItemCreate[];
}

/**
 * PATCH body. NOTE: `subtotal` is accepted here and, if sent, overrides the
 * value derived from the items — the service recomputes `total_amount` from
 * whatever subtotal it is given rather than from the line items.
 */
export interface QuotationUpdate {
  customer_id?: number | null;
  staff_id?: number | null;
  ref_number?: string;
  quotation_date?: string;
  expiry_date?: string | null;
  production_days?: number | null;
  artwork_status?: ArtworkStatus | null;
  payment_terms?: string | null;
  delivery_method?: DeliveryMethod | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  note?: string | null;
}

export interface QuotationStatusUpdate {
  status: QuotationStatus;
  note?: string | null;
}

export interface QuotationResponse {
  quotation_id: number;
  company_id: number;
  /** Flattened off the customer relation by a model_validator. */
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_id?: number | null;
  staff_id?: number | null;
  ref_number: string;
  quotation_date: string;
  expiry_date?: string | null;
  status: QuotationStatus;
  production_days?: number | null;
  artwork_status?: string | null;
  payment_terms?: string | null;
  delivery_method?: string | null;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total_amount: string | number;
  /** Set once converted — blocks editing and deletion. */
  invoice_id?: number | null;
  note?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  items: QuotationItemResponse[];
}

export interface QuotationStaffGroup {
  staff_id: number;
  user_id: number;
  username: string;
  full_name: string;
  quotations: QuotationResponse[];
}

export interface QuotationSummary {
  total_quotations: number;
  total_draft: number;
  total_sent: number;
  total_accepted: number;
  total_amount: string | number;
}
