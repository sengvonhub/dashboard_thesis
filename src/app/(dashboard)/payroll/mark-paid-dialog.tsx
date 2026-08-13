"use client";

import { useState } from "react";
import type { SalaryResponse } from "@/state/types/salaries";
import { useToast } from "@/app/(components)/ui/toast";
import { useMarkSalaryPaidMutation } from "@/state/tageTypes/services/salariesApi";
import { Modal } from "@/app/(components)/ui/modal";
import { formatMoney } from "@/state/tageTypes/lib/format-money";
import { Button, Input, Label } from "@/app/(components)/ui/form-elements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: SalaryResponse | null;
}

export function MarkPaidDialog({ open, onOpenChange, salary }: Props) {
  const toast = useToast();
  const [paymentDate, setPaymentDate] = useState("");
  const [markPaid, { isLoading }] = useMarkSalaryPaidMutation();

  if (!salary) return null;

  const handleConfirm = async () => {
    try {
      await markPaid({
        salaryId: salary.salary_id,
        data: paymentDate ? { payment_date: paymentDate } : undefined,
      }).unwrap();
      toast.success("Marked as paid");
      onOpenChange(false);
      setPaymentDate("");
    } catch (err: any) {
      toast.error(err?.data?.detail ?? "Could not mark as paid");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Mark salary as paid"
      description={`Net salary of ${formatMoney(salary.net_salary)} for ${salary.pay_period_start} – ${salary.pay_period_end}.`}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Confirm payment
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        <Label>Payment date (optional — defaults to today)</Label>
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
      </div>
    </Modal>
  );
}