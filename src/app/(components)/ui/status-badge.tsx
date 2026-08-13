import { Badge } from "@/app/(components)/ui/form-elements";
import type { PaymentStatus } from "@/state/types/salaries";

const STYLES: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export function SalaryStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={STYLES[status]}>{status}</Badge>;
}