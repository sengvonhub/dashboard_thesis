"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/(components)/ui/toast";
import { Modal } from "@/app/(components)/ui/modal";
import { Button, Input, Label, Select } from "@/app/(components)/ui/form-elements";

import type { PaymentStatus, SalaryResponse } from "@/state/types/salaries";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import { useCreateSalaryMutation, useUpdateSalaryMutation } from "@/state/tageTypes/services/salariesApi";
import { StaffPicker } from "@/app/(components)/ui/staff-picker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary?: SalaryResponse;
}

const EMPTY_FORM = {
  staff_id: "",
  base_salary: "", // only ever populated in edit mode — see note below
  bonus: "0",
  deductions: "0",
  pay_period_start: "",
  pay_period_end: "",
  payment_status: "pending" as PaymentStatus,
};

export function SalaryFormDialog({ open, onOpenChange, salary }: Props) {
  const isEdit = !!salary;
  const toast = useToast();
  const { data: staffList, isLoading: staffLoading } = useGetAllStaffQuery();
  const [createSalary, { isLoading: creating }] = useCreateSalaryMutation();
  const [updateSalary, { isLoading: updating }] = useUpdateSalaryMutation();

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (salary) {
      setForm({
        staff_id: String(salary.staff_id),
        base_salary: salary.base_salary,
        bonus: salary.bonus,
        deductions: salary.deductions,
        pay_period_start: salary.pay_period_start,
        pay_period_end: salary.pay_period_end,
        payment_status: salary.payment_status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, salary]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ✅ on create, base_salary comes from the selected staff's role — the
  // backend derives it server-side, this is just a preview so the manager
  // knows what net_salary will be calculated from before submitting.
  const selectedStaff = useMemo(
    () => staffList?.find((s) => String(s.staff_id) === form.staff_id),
    [staffList, form.staff_id],
  );
  const roleBaseSalary = selectedStaff?.staff_role?.base_salary ?? null;

  const isValid = isEdit
    ? form.staff_id && form.base_salary !== "" && form.pay_period_start && form.pay_period_end
    : form.staff_id &&
      roleBaseSalary !== null &&
      form.pay_period_start &&
      form.pay_period_end &&
      form.pay_period_start <= form.pay_period_end;

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await updateSalary({
          salaryId: salary!.salary_id,
          data: {
            base_salary: form.base_salary,
            bonus: form.bonus,
            deductions: form.deductions,
            payment_status: form.payment_status,
          },
        }).unwrap();
        toast.success("Salary record updated");
      } else {
        // base_salary is required by the API — it isn't user-editable on
        // create, so send the value derived from the staff's role (the same
        // number shown in the read-only preview below).
        await createSalary({
          staff_id: Number(form.staff_id),
          base_salary: roleBaseSalary as number | string,
          bonus: form.bonus,
          deductions: form.deductions,
          pay_period_start: form.pay_period_start,
          pay_period_end: form.pay_period_end,
          payment_status: form.payment_status,
        }).unwrap();
        toast.success("Salary record created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.data?.detail ?? "Something went wrong");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit salary record" : "New salary record"}
      description={
        isEdit
          ? "Update base pay, bonus, deductions, or status."
          : "Create a salary record for a pay period."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || creating || updating}>
            {isEdit ? "Save changes" : "Create record"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Staff</Label>
          {/* ✅ avatar-aware picker — a native <select> can't render images
             inside <option>, so this replaces it for both create and edit */}
          <StaffPicker
            staff={staffList}
            value={form.staff_id}
            onChange={set("staff_id")}
            disabled={isEdit}
            loading={staffLoading}
          />
        </div>

        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Period start</Label>
              <Input
                type="date"
                value={form.pay_period_start}
                onChange={(e) => set("pay_period_start")(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Period end</Label>
              <Input
                type="date"
                value={form.pay_period_end}
                onChange={(e) => set("pay_period_end")(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Base salary</Label>
            {isEdit ? (
              <Input
                type="number"
                min={0}
                value={form.base_salary}
                onChange={(e) => set("base_salary")(e.target.value)}
              />
            ) : (
              // ✅ read-only preview on create — set on the staff's role, not here
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {!form.staff_id
                  ? "Select staff first"
                  : roleBaseSalary === null
                    ? "No base_salary set on this role"
                    : roleBaseSalary}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Bonus</Label>
            <Input
              type="number"
              min={0}
              value={form.bonus}
              onChange={(e) => set("bonus")(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Deductions</Label>
            <Input
              type="number"
              min={0}
              value={form.deductions}
              onChange={(e) => set("deductions")(e.target.value)}
            />
          </div>
        </div>
        {!isEdit && roleBaseSalary === null && form.staff_id && (
          <p className="text-xs text-destructive -mt-2">
            This staff member's role has no base salary set. Set one on the
            role before creating a salary record.
          </p>
        )}

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            value={form.payment_status}
            onChange={(e) => set("payment_status")(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}