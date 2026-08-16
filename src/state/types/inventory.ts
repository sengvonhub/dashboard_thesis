/** Transcribed from app/schemas/schema.py — inventory domain. */

// ── Category ─────────────────────────────────────────────
export interface CategoryResponse {
  category_id: number;
  company_id: number;
  category_name: string;
  category_total: string | number;
  image_url?: string | null;
  image_public_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Product ──────────────────────────────────────────────
export interface ProductImageResponse {
  images_id: number;
  product_id: number;
  company_id: number;
  variant_id?: number | null;
  image_url: string;
  /** Serialised from the model's `image_public_id` via a validation alias. */
  public_id: string;
  is_primary: boolean;
  sort_order: number;
}



export interface ProductVariantResponse {
  variant_id: number;
  product_id: number;
  sku?: string | null;
  /** Free-form JSON on the model, e.g. { size: "A4", colour: "white" }. */
  specs: Record<string, unknown>;
  price: string | number;
  stock_quantity: number;
  created_at: string;
  updated_at?: string | null;
  images: ProductImageResponse[];
}

/**
 * POST /products/{product_id}/variants — JSON. `product_id` comes from the
 * path, not the body. Images have their own sub-routes, as on products.
 */
export interface ProductVariantCreate {
  sku?: string | null;
  specs?: Record<string, unknown>;
  price: number;
  stock_quantity?: number;
}

export type ProductVariantUpdate = Partial<ProductVariantCreate>;

export interface ProductResponse {
  product_id: number;
  company_id: number;
  category_id?: number | null;
  name: string;
  descriptions?: string | null;
  variants: ProductVariantResponse[];
  images: ProductImageResponse[];
  created_at: string;
  updated_at?: string | null;
}

/** POST/PATCH /products — JSON, not multipart. Images have their own routes. */
export interface ProductCreate {
  category_id?: number | null;
  name: string;
  descriptions?: string | null;
}

export type ProductUpdate = Partial<ProductCreate>;

// ── Supplier ─────────────────────────────────────────────
export interface SupplierResponse {
  supplier_id: number;
  company_id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** multipart/form-data on both create and update. */
export interface SupplierForm {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  address?: string | null;
  avatar?: File | null;
}

// ── Customer ─────────────────────────────────────────────
export interface CustomerResponse {
  customer_id: number;
  company_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  total_purchase: string | number;
  created_at: string;
  updated_at?: string | null;
}

export interface CustomerForm {
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: File | null;
}

// ── Stock movement ───────────────────────────────────────
export type MovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "purchase"
  | "sale"
  | "return_in"
  | "return_out"
  | "transfer"
  | "damage"
  | "opening";

export interface StockMovementResponse {
  movement_id: number;
  company_id: number;
  variant_id: number;
  qty_in: number;
  qty_out: number;
  balance_quantity?: number | null;
  movement_type: MovementType;
  date: string;
  reference_id?: number | null;
  opening_balance?: number | null;
  unit_price?: number | null;
}

/**
 * POST /stock-movements — `product_id` is required by the schema and used to
 * look the variant up, but the service strips it before persisting.
 */
export interface StockMovementCreate {
  product_id: number;
  variant_id: number;
  qty_in?: number;
  qty_out?: number;
  movement_type: MovementType;
  date: string; // YYYY-MM-DD
  reference_id?: number | null;
  unit_price?: number | null;
}

export interface StockReportBucket {
  period_label?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  product_id?: number | null;
  product_name?: string | null;
  product_description?: string | null;
  variant_id?: number | null;
  variant_sku?: string | null;
  variant_specs?: Record<string, unknown> | null;
  price?: string | number | null;
  qty_in: number;
  qty_out: number;
  net_change: number;
  movement_count: number;
  value_in: string | number;
  value_out: string | number;
  net_value: string | number;
  opening_balance?: number | null;
  closing_balance?: number | null;
  closing_stock_value?: string | number | null;
}

export interface StockReportResponse {
  period: "day" | "week" | "month" | "year" | "all";
  category_id?: number | null;
  buckets: StockReportBucket[];
  total_qty_in: number;
  total_qty_out: number;
  total_net_change: number;
  total_value_in: string | number;
  total_value_out: string | number;
  total_net_value: string | number;
  total_closing_stock_value?: string | number | null;
}

// ── Invoice ──────────────────────────────────────────────
export type PaymentType = "cash" | "card" | "transfer";

export interface InvoiceItemResponse {
  item_id: number;
  invoice_id: number;
  company_id: number;
  product_id?: number | null;
  variant_id?: number | null;
  item_name?: string | null;
  size?: string | null;
  pages?: number | null;
  print_side?: string | null;
  color_spec?: string | null;
  paper_cover?: string | null;
  paper_inside?: string | null;
  finishing?: string | null;
  quantity: number;
  unit_price: string | number;
  total_price?: string | number | null;
}

export interface InvoiceAttachmentResponse {
  attachment_id: number;
  company_id: number;
  invoice_id: number;
  file_url: string;
  public_id?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  created_at: string;
}

export interface InvoiceResponse {
  invoice_id: number;
  company_id: number;
  staff_id?: number | null;
  customer_id?: number | null;
  total_amount?: string | number | null;
  discount: string | number;
  tax: string | number;
  payment_type?: PaymentType | null;
  items: InvoiceItemResponse[];
  attachments: InvoiceAttachmentResponse[];
  created_at: string;
  updated_at?: string | null;
}

export interface InvoiceItemCreate {
  product_id?: number | null;
  variant_id?: number | null;
  item_name?: string | null;
  quantity: number;
  unit_price: number;
}

export interface InvoiceCreate {
  customer_id?: number | null;
  total_amount?: number | null;
  discount?: number;
  tax?: number;
  payment_type?: PaymentType | null;
  items: InvoiceItemCreate[];
}

export interface InvoiceUpdate {
  total_amount?: number;
  discount?: number;
  tax?: number;
  payment_type?: PaymentType | null;
}

// ── Dashboard ────────────────────────────────────────────
export interface DashboardStatBlock {
  value: number;
  sub: string;
  spark: number[];
  badge_pct?: number | null;
  current_period_value?: number;
  previous_period_value?: number;
  all_time_value?: number;
  stock_in?: number;
  stock_out?: number;
}

export interface DashboardStatsResponse {
  live_chat: DashboardStatBlock;
  stock: DashboardStatBlock;
  stock_value: DashboardStatBlock;
  expenses: DashboardStatBlock;
  revenue: DashboardStatBlock;
}

// ── Supplier product prices ─────────────────────────────
// Transcribed from app/schemas/schema.py.
export interface ProductBrief {
  product_id: number;
  name: string;
}

export interface SupplierBrief {
  supplier_id: number;
  name: string;
}

export interface ProductVariantBrief {
  variant_id: number;
  sku?: string | null;
  product: ProductBrief;
}

export interface SupplierProductPriceResponse {
  price_id: number;
  supplier_id: number;
  variant_id: number;
  unit_price: string | number;
  note?: string | null;
  created_at: string;
  updated_at: string;
  variant: ProductVariantBrief;
  supplier: SupplierBrief;
}

/** POST /supplier-prices/ — 409s if a price for this supplier+variant already exists. */
export interface SupplierProductPriceCreate {
  supplier_id: number;
  variant_id: number;
  unit_price: number | string;
  note?: string | null;
}

/** PATCH /supplier-prices/{id} — every field optional. */
export interface SupplierProductPriceUpdate {
  unit_price?: number | string;
  note?: string | null;
}

/** GET /supplier-prices/by-supplier/{supplier_id}/categories */
export interface CategoryBrief {
  category_id: number;
  category_name: string;
}
