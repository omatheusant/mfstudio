"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { markPaymentPaid, type ActionState } from "@/features/payments/actions";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants/payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MarkPaidDialog({
  organizationId,
  paymentId,
  studentId,
  trigger,
}: {
  organizationId: string;
  paymentId: string;
  studentId: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = markPaymentPaid.bind(null, organizationId, paymentId, studentId);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success("Pagamento marcado como pago.");
        setOpen(false);
      }
      return result;
    },
    undefined as ActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>Confirme a forma e a data do pagamento.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-method">Forma de pagamento</Label>
            <Select name="payment_method">
              <SelectTrigger id="payment-method" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paid-at">Data do pagamento</Label>
            <Input id="paid-at" name="paid_at" type="date" defaultValue={todayISO()} required />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
