"use client";
import { SalaryStatusBadge } from "@/app/(components)/ui/status-badge";
import { formatMoney } from "@/state/tageTypes/lib/format-money";
import { useGetMySalariesQuery } from "@/state/tageTypes/services/salariesApi";
import type { PaymentStatus, SalaryResponse } from "@/state/types/salaries";

export function MySalaries() {
  const { data: salaries, isFetching } = useGetMySalariesQuery();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Period", "Base", "Bonus", "Deductions", "Net", "Status", "Paid on"].map((h) => (
              <th key={h} className="text-left font-medium text-gray-500 px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isFetching && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-500">
                Loading…
              </td>
            </tr>
          )}
          {!isFetching && salaries?.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-500">
                No salary records yet.
              </td>
            </tr>
          )}
          {salaries?.map((s: SalaryResponse) => (
            <tr key={s.salary_id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                {s.pay_period_start} – {s.pay_period_end}
              </td>
              <td className="px-4 py-3">{formatMoney(s.base_salary)}</td>
              <td className="px-4 py-3 text-emerald-600">+{formatMoney(s.bonus)}</td>
              <td className="px-4 py-3 text-red-600">-{formatMoney(s.deductions)}</td>
              <td className="px-4 py-3 font-semibold">{formatMoney(s.net_salary)}</td>
              <td className="px-4 py-3">
                <SalaryStatusBadge status={s.payment_status as PaymentStatus} />
              </td>
              <td className="px-4 py-3">{s.payment_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}