import { api } from "@/state/api";
import type {
  CategoryResponse,
  CustomerForm,
  CustomerResponse,
  DashboardStatsResponse,
  InvoiceCreate,
  InvoiceResponse,
  InvoiceUpdate,
  ProductCreate,
  ProductImageResponse,
  ProductResponse,
  ProductUpdate,
  StockMovementCreate,
  StockMovementResponse,
  StockReportResponse,
  SupplierForm,
  SupplierResponse,
} from "@/state/types/inventory";

/**
 * Inventory domain: suppliers, customers, categories, products, stock
 * movements, invoices and the dashboard aggregates.
 *
 * Guards are noted per route — they are inconsistent across the module, e.g.
 * customers are `require_login` to create but `require_manager` to delete,
 * while every supplier route is `require_manager`.
 *
 * Several create/update routes are multipart because they accept an image;
 * those build FormData rather than JSON.
 */

/** Appends only the fields that carry a value — "" would overwrite real data. */
function toForm(fields: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    form.append(key, value instanceof File ? value : String(value));
  }
  return form;
}

export const inventoryApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ═══════════════ SUPPLIERS (all require_manager) ═══════
    getSuppliers: build.query<SupplierResponse[], void>({
      query: () => "/suppliers/",
      providesTags: [{ type: "Inventory", id: "SUPPLIERS" }],
    }),

    getSupplier: build.query<SupplierResponse, number>({
      query: (id) => `/suppliers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Inventory", id: `SUP-${id}` }],
    }),

    createSupplier: build.mutation<SupplierResponse, SupplierForm>({
      query: (data) => ({
        url: "/suppliers/",
        method: "POST",
        body: toForm({ ...data }),
      }),
      invalidatesTags: [{ type: "Inventory", id: "SUPPLIERS" }],
    }),

    updateSupplier: build.mutation<
      SupplierResponse,
      { id: number; data: Partial<SupplierForm> }
    >({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: "PATCH",
        body: toForm({ ...data }),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Inventory", id: `SUP-${id}` },
        { type: "Inventory", id: "SUPPLIERS" },
      ],
    }),

    deleteSupplierAvatar: build.mutation<SupplierResponse, number>({
      query: (id) => ({ url: `/suppliers/${id}/avatar`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "SUPPLIERS" }],
    }),

    deleteSupplier: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "SUPPLIERS" }],
    }),

    // ═══════════════ CUSTOMERS ═════════════════════════════
    // Read/create/update are require_login; DELETE is require_manager.
    getCustomers: build.query<CustomerResponse[], void>({
      query: () => "/customers/",
      providesTags: [{ type: "Inventory", id: "CUSTOMERS" }],
    }),

    getCustomer: build.query<CustomerResponse, number>({
      query: (id) => `/customers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Inventory", id: `CUS-${id}` }],
    }),

    createCustomer: build.mutation<CustomerResponse, CustomerForm>({
      query: (data) => ({
        url: "/customers/",
        method: "POST",
        body: toForm({ ...data }),
      }),
      invalidatesTags: [{ type: "Inventory", id: "CUSTOMERS" }],
    }),

    updateCustomer: build.mutation<
      CustomerResponse,
      { id: number; data: Partial<CustomerForm> }
    >({
      query: ({ id, data }) => ({
        url: `/customers/${id}`,
        method: "PATCH",
        body: toForm({ ...data }),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Inventory", id: `CUS-${id}` },
        { type: "Inventory", id: "CUSTOMERS" },
      ],
    }),

    deleteCustomerAvatar: build.mutation<CustomerResponse, number>({
      query: (id) => ({ url: `/customers/${id}/avatar`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "CUSTOMERS" }],
    }),

    deleteCustomer: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/customers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "CUSTOMERS" }],
    }),

    // ═══════════════ CATEGORIES ════════════════════════════
    // Reads are require_login; writes are require_manager.
    getCategories: build.query<CategoryResponse[], void>({
      query: () => "/categories/",
      providesTags: [{ type: "Inventory", id: "CATEGORIES" }],
    }),

    getCategory: build.query<CategoryResponse, number>({
      query: (id) => `/categories/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Inventory", id: `CAT-${id}` }],
    }),

    createCategory: build.mutation<
      CategoryResponse,
      { category_name: string; category_total?: number; image?: File | null }
    >({
      query: (data) => ({
        url: "/categories/",
        method: "POST",
        body: toForm({ ...data }),
      }),
      invalidatesTags: [{ type: "Inventory", id: "CATEGORIES" }],
    }),

    /**
     * NOTE: the route only reads `category_name` and `image` from the form —
     * it builds `CategoryUpdate(category_name=...)` and drops everything else,
     * so `category_total` cannot be changed here however it is sent.
     */
    updateCategory: build.mutation<
      CategoryResponse,
      { id: number; category_name?: string; image?: File | null }
    >({
      query: ({ id, ...data }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        body: toForm({ ...data }),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Inventory", id: `CAT-${id}` },
        { type: "Inventory", id: "CATEGORIES" },
      ],
    }),

    deleteCategoryImage: build.mutation<CategoryResponse, number>({
      query: (id) => ({ url: `/categories/${id}/image`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "CATEGORIES" }],
    }),

    deleteCategory: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "CATEGORIES" }],
    }),

    // ═══════════════ PRODUCTS ══════════════════════════════
    // Reads require_login; writes require_manager. JSON, not multipart.
    getProducts: build.query<ProductResponse[], { categoryId?: number } | void>({
      query: (args) => ({
        url: "/products/",
        params: args?.categoryId ? { category_id: args.categoryId } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((p) => ({
                type: "Inventory" as const,
                id: p.product_id,
              })),
              { type: "Inventory" as const, id: "PRODUCTS" },
            ]
          : [{ type: "Inventory" as const, id: "PRODUCTS" }],
    }),

    getProduct: build.query<ProductResponse, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Inventory", id }],
    }),

    createProduct: build.mutation<ProductResponse, ProductCreate>({
      query: (body) => ({ url: "/products/", method: "POST", body }),
      invalidatesTags: [{ type: "Inventory", id: "PRODUCTS" }],
    }),

    updateProduct: build.mutation<
      ProductResponse,
      { id: number; body: ProductUpdate }
    >({
      query: ({ id, body }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Inventory", id },
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    deleteProduct: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "PRODUCTS" }],
    }),

    // ── product images ───────────────────────────────────
    addProductImage: build.mutation<
      ProductImageResponse,
      { productId: number; image: File; is_primary?: boolean; sort_order?: number }
    >({
      query: ({ productId, image, is_primary = false, sort_order = 0 }) => {
        const form = new FormData();
        form.append("image", image);
        // Booleans/numbers must still be sent, so this bypasses toForm's
        // empty-value skipping (false and 0 are meaningful here).
        form.append("is_primary", String(is_primary));
        form.append("sort_order", String(sort_order));
        return { url: `/products/${productId}/images`, method: "POST", body: form };
      },
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "Inventory", id: productId },
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    setPrimaryProductImage: build.mutation<
      ProductImageResponse,
      { productId: number; imageId: number }
    >({
      query: ({ productId, imageId }) => ({
        url: `/products/${productId}/images/${imageId}/set-primary`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "Inventory", id: productId },
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    deleteProductImage: build.mutation<
      { message?: string },
      { productId: number; imageId: number }
    >({
      query: ({ productId, imageId }) => ({
        url: `/products/${productId}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "Inventory", id: productId },
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    // ═══════════════ STOCK MOVEMENTS ═══════════════════════
    getStockMovements: build.query<
      StockMovementResponse[],
      { variantId?: number; startDate?: string; endDate?: string } | void
    >({
      query: (args) => ({
        url: "/stock-movements/",
        params: {
          ...(args?.variantId ? { variant_id: args.variantId } : {}),
          ...(args?.startDate ? { start_date: args.startDate } : {}),
          ...(args?.endDate ? { end_date: args.endDate } : {}),
        },
      }),
      providesTags: [{ type: "Inventory", id: "MOVEMENTS" }],
    }),

    getStockReport: build.query<
      StockReportResponse,
      {
        period?: "day" | "week" | "month" | "year" | "all";
        categoryId?: number;
        variantId?: number;
        startDate?: string;
        endDate?: string;
        includeBalance?: boolean;
      } | void
    >({
      query: (args) => ({
        url: "/stock-movements/reports",
        params: {
          period: args?.period ?? "all",
          ...(args?.categoryId ? { category_id: args.categoryId } : {}),
          ...(args?.variantId ? { variant_id: args.variantId } : {}),
          ...(args?.startDate ? { start_date: args.startDate } : {}),
          ...(args?.endDate ? { end_date: args.endDate } : {}),
          ...(args?.includeBalance ? { include_balance: true } : {}),
        },
      }),
      providesTags: [{ type: "Inventory", id: "REPORT" }],
    }),

    /**
     * POST /stock-movements — require_manager. Adjusts the variant's
     * stock_quantity as a side effect and 400s when the result would go
     * negative.
     */
    createStockMovement: build.mutation<
      StockMovementResponse,
      StockMovementCreate
    >({
      query: (body) => ({ url: "/stock-movements/", method: "POST", body }),
      invalidatesTags: [
        { type: "Inventory", id: "MOVEMENTS" },
        { type: "Inventory", id: "REPORT" },
        // Stock levels live on the variant, which rides on the product.
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    /** Soft delete — the service flags is_deleted and reverses the stock. */
    deleteStockMovement: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/stock-movements/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Inventory", id: "MOVEMENTS" },
        { type: "Inventory", id: "REPORT" },
        { type: "Inventory", id: "PRODUCTS" },
      ],
    }),

    // ═══════════════ INVOICES ══════════════════════════════
    getInvoices: build.query<InvoiceResponse[], { customerId?: number } | void>({
      query: (args) => ({
        url: "/invoices/",
        params: args?.customerId ? { customer_id: args.customerId } : undefined,
      }),
      providesTags: [{ type: "Inventory", id: "INVOICES" }],
    }),

    getInvoice: build.query<InvoiceResponse, number>({
      query: (id) => `/invoices/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Inventory", id: `INV-${id}` }],
    }),

    /**
     * POST /invoices — require_login, but the handler reads
     * `current_user["staff_id"]`, so a user account with no staff record
     * fails with a KeyError rather than a clean 4xx.
     */
    createInvoice: build.mutation<InvoiceResponse, InvoiceCreate>({
      query: (body) => ({ url: "/invoices/", method: "POST", body }),
      invalidatesTags: [
        { type: "Inventory", id: "INVOICES" },
        { type: "Inventory", id: "PRODUCTS" },
        { type: "Inventory", id: "CUSTOMERS" },
      ],
    }),

    createInvoiceFromQuotation: build.mutation<
      InvoiceResponse,
      { quotation_id: number; payment_type?: string | null }
    >({
      query: (body) => ({
        url: "/invoices/from-quotation",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Inventory", id: "INVOICES" },
        { type: "Inventory", id: "PRODUCTS" },
        { type: "Notification", id: "LIST" },
      ],
    }),

    updateInvoice: build.mutation<
      InvoiceResponse,
      { id: number; body: InvoiceUpdate }
    >({
      query: ({ id, body }) => ({
        url: `/invoices/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Inventory", id: `INV-${id}` },
        { type: "Inventory", id: "INVOICES" },
      ],
    }),

    addInvoiceAttachment: build.mutation<
      unknown,
      { invoiceId: number; file: File; fileType?: string }
    >({
      query: ({ invoiceId, file, fileType }) => {
        const form = new FormData();
        form.append("file", file);
        if (fileType) form.append("file_type", fileType);
        return {
          url: `/invoices/${invoiceId}/attachments`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: "Inventory", id: `INV-${invoiceId}` },
        { type: "Inventory", id: "INVOICES" },
      ],
    }),

    deleteInvoiceAttachment: build.mutation<
      { message?: string },
      { invoiceId: number; attachmentId: number }
    >({
      query: ({ invoiceId, attachmentId }) => ({
        url: `/invoices/${invoiceId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { invoiceId }) => [
        { type: "Inventory", id: `INV-${invoiceId}` },
        { type: "Inventory", id: "INVOICES" },
      ],
    }),

    deleteInvoice: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Inventory", id: "INVOICES" }],
    }),

    // ═══════════════ DASHBOARD ═════════════════════════════
    getDashboardStats: build.query<DashboardStatsResponse, { days?: number } | void>(
      {
        query: (args) => ({
          url: "/dashboard/stats",
          params: { days: args?.days ?? 11 },
        }),
        providesTags: [{ type: "Inventory", id: "DASH_STATS" }],
      }
    ),

    getDashboardReport: build.query<
      Record<string, unknown>,
      { period?: "day" | "week" | "month" | "year" } | void
    >({
      query: (args) => ({
        url: "/dashboard/report",
        params: { period: args?.period ?? "week" },
      }),
      providesTags: [{ type: "Inventory", id: "DASH_REPORT" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierAvatarMutation,
  useDeleteSupplierMutation,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerAvatarMutation,
  useDeleteCustomerMutation,
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryImageMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddProductImageMutation,
  useSetPrimaryProductImageMutation,
  useDeleteProductImageMutation,
  useGetStockMovementsQuery,
  useGetStockReportQuery,
  useCreateStockMovementMutation,
  useDeleteStockMovementMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useCreateInvoiceFromQuotationMutation,
  useUpdateInvoiceMutation,
  useAddInvoiceAttachmentMutation,
  useDeleteInvoiceAttachmentMutation,
  useDeleteInvoiceMutation,
  useGetDashboardStatsQuery,
  useGetDashboardReportQuery,
} = inventoryApi;
