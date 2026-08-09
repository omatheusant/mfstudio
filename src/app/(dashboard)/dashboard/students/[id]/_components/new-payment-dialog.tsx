"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { createPayment, type ActionState } from "@/features/payments/actions";
import { formatCurrency } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

type SubscriptionOption = { id: string; plan_name: string; price: number };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewPaymentDialog({
  organizationId,
  studentId,
  subscriptions,
  trigger,
}: {
  organizationId: string;
  studentId: string;
  subscriptions: SubscriptionOption[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const boundAction = createPayment.bind(null, organizationId, studentId);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) {
        toast.success("Pagamento registrado.");
        setOpen(false);
      }
      return result;
    },
    undefined as ActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo pagamento</DialogTitle>
          <DialogDescription>Cria uma cobrança pendente para o aluno.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-subscription">Assinatura</Label>
            <Select
              name="subscription_id"
              onValueChange={(value) => {
                const sub = subscriptions.find((s) => s.id === value);
                if (sub) setAmount(sub.price);
              }}
            >
              <SelectTrigger id="payment-subscription" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.plan_name} — {formatCurrency(sub.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-amount">Valor (R$)</Label>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-due-date">Vencimento</Label>
            <Input
              id="payment-due-date"
              name="due_date"
              type="date"
              defaultValue={todayISO()}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-notes">Observações (opcional)</Label>
            <Textarea id="payment-notes" name="notes" rows={2} />
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
            <Button type="submit" disabled={pending || subscriptions.length === 0}>
              {pending ? "Salvando..." : "Criar cobrança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
