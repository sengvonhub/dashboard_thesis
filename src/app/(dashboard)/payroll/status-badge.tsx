import type { PaymentStatus } from "@/state/types/salaries";
import { Badge } from "lucide-react";

const STYLES: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function SalaryStatusBadge({ status }: { status: PaymentStatus }) {
    function cn(arg0: string, arg1: string): string | undefined {
        throw new Error("Function not implemented.");
    }

  return (
    <Badge className={cn("capitalize font-medium", STYLES[status])}>
      {status}
    </Badge>
  );
}