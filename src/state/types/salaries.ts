export type PaymentStatus = "pending" | "paid" | "cancelled";
export type AdjustmentType = "bonus" | "deduction";

// ── Salaries ─────────────────────────────────────────
/** POST /salaries/ — JSON body (SalaryCreate). */
export interface SalaryCreate {
  staff_id: number;
  managed_by?: number | null;
  // base_salary: number | string;
  bonus?: number | string;
  deductions?: number | string;
  net_salary?: number | string | null; // server recalculates anyway
  pay_period_start: string; // YYYY-MM-DD
  pay_period_end: string;   // YYYY-MM-DD
  payment_status?: PaymentStatus;
  payment_date?: string | null;
}

/**
 * PATCH /salaries/{id} — every field optional. `staff_id` is intentionally
 * absent: the route/service never let you reassign a salary record to a
 * different staff member.
 */
export interface SalaryUpdate {
  base_salary?: number | string;
  bonus?: number | string;
  deductions?: number | string;
  net_salary?: number | string;
  payment_status?: PaymentStatus;
  payment_date?: string | null;
}

export interface SalaryResponse {
  salary_id: number;
  staff_id: number;
  managed_by?: number | null;
  base_salary: string;
  bonus: string;
  deductions: string;
  net_salary: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_status: PaymentStatus;
  payment_date?: string | null;
  created_at: string;
}

export interface SalaryStaffGroupResponse {
  staff_id: number;
  user_id: number;
  username: string;
  full_name: string;
  salaries: SalaryResponse[];
}

/**
 * PATCH /salaries/{id}/mark-paid. `payment_date` has a server-side
 * `default_factory=date.today`, so it's optional here — omit it to let the
 * backend stamp today's date.
 */
export interface MarkPaidRequest {
  payment_date?: string; // YYYY-MM-DD
}

export interface SalarySummaryResponse {
  total_salaries: number;
  total_paid: number;
  total_pending: number;
  total_net_amount: string;
}

// ── Adjustments ──────────────────────────────────────
/**
 * POST /salaries/adjustments. `adjusted_by` is accepted by the schema but
 * the route always overwrites it with `int(current_user["sub"])` server-side
 * — don't bother sending it.
 */
export interface SalaryAdjustmentCreate {
  salary_id: number;
  adjustment_type: AdjustmentType;
  amount: number | string;
  reason?: string | null;
}

export interface SalaryAdjustmentResponse {
  adjustment_id: number;
  salary_id: number;
  adjusted_by?: number | null;
  adjustment_type: AdjustmentType;
  amount: string;
  reason?: string | null;
  created_at: string;
}