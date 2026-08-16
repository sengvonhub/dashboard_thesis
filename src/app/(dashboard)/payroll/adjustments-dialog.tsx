"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

import type { AdjustmentType, SalaryAdjustmentResponse, SalaryResponse } from "@/state/types/salaries";
import { useToast } from "@/app/(components)/ui/toast";
import { useCreateSalaryAdjustmentMutation, useDeleteSalaryAdjustmentMutation, useGetSalaryAdjustmentsQuery } from "@/state/tageTypes/services/salariesApi";
import { Modal } from "@/app/(components)/ui/modal";
import { formatMoney } from "@/state/tageTypes/lib/format-money";
import { Badge, Button, Input, Label, Select, Textarea } from "@/app/(components)/ui/form-elements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: SalaryResponse | null;
}

export function AdjustmentsDialog({ open, onOpenChange, salary }: Props) {
  const toast = useToast();
  const salaryId = salary?.salary_id;

  const { data: adjustments, isFetching } = useGetSalaryAdjustmentsQuery(salaryId!, {
    skip: !salaryId,
  });
  const [createAdjustment, { isLoading: creating }] = useCreateSalaryAdjustmentMutation();
  const [deleteAdjustment] = useDeleteSalaryAdjustmentMutation();

  const [type, setType] = useState<AdjustmentType>("bonus");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (!salary) return null;

  const resetForm = () => {
    setType("bonus");
    setAmount("");
    setReason("");
  };

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    try {
      await createAdjustment({
        salary_id: salary.salary_id,
        adjustment_type: type,
        amount,
        reason: reason || undefined,
      }).unwrap();
      toast.success(type === "bonus" ? "Bonus added" : "Deduction applied");
      resetForm();
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string } };
      toast.error(apiErr?.data?.detail ?? "Could not add adjustment");
    }
  };

  const handleDelete = async (adjustmentId: number) => {
    try {
      await deleteAdjustment({ adjustmentId, salaryId: salary.salary_id }).unwrap();
      toast.success("Adjustment removed");
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string } };
      toast.error(apiErr?.data?.detail ?? "Could not remove adjustment");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Adjustments"
      description={`Bonuses and deductions for ${salary.pay_period_start} – ${salary.pay_period_end}. Net salary: ${formatMoney(salary.net_salary)}`}
      maxWidth="max-w-lg"
    >
      <div className="max-h-56 overflow-y-auto space-y-2">
        {isFetching && <p className="text-sm text-gray-500">Loading…</p>}
        {!isFetching && adjustments?.length === 0 && (
          <p className="text-sm text-gray-500">No adjustments yet.</p>
        )}
        {adjustments?.map((a: SalaryAdjustmentResponse) => (
            
          <div
            key={a.adjustment_id}
            className="flex items-center justify-between rounded-md border border-gray-200 p-2"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    a.adjustment_type === "bonus"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {a.adjustment_type}
                </Badge>
                <span className="font-medium">{formatMoney(a.amount)}</span>
              </div>
              {a.reason && <span className="text-xs text-gray-500">{a.reason}</span>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => handleDelete(a.adjustment_id)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t mt-4 pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
        <Button onClick={handleAdd} disabled={creating} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add {type === "bonus" ? "bonus" : "deduction"}
        </Button>
      </div>
    </Modal>
  );
}