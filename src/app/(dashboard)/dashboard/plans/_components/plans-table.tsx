"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { deletePlan, setPlanActive } from "@/features/plans/actions";
import type { PlanWithCategories } from "@/features/plans/queries";
import type { ScheduleCategoryRow } from "@/features/schedules/queries";
import {
  BILLING_CYCLE_LABEL,
  SESSION_PERIOD_LABEL,
} from "@/lib/constants/plans";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PlanDialog } from "./plan-dialog";

export function PlansTable({
  organizationId,
  plans,
  categories,
}: {
  organizationId: string;
  plans: PlanWithCategories[];
  categories: ScheduleCategoryRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function toggleActive(plan: PlanWithCategories, active: boolean) {
    startTransition(async () => {
      try {
        await setPlanActive(organizationId, plan.id, active);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
      }
    });
  }

  function remove(plan: PlanWithCategories) {
    startTransition(async () => {
      try {
        await deletePlan(organizationId, plan.id);
        toast.success("Plano removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Planos</CardTitle>
          <CardDescription>
            Preço, sessões e categorias de horário permitidas para cada
            plano.
          </CardDescription>
        </div>
        <PlanDialog
          organizationId={organizationId}
          categories={categories}
          trigger={
            <Button size="sm" disabled={categories.length === 0}>
              <Plus className="size-4" />
              Novo plano
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crie uma categoria de horário na aba{" "}
            <strong>Categorias</strong> de{" "}
            <Link href="/dashboard/settings" className="underline underline-offset-4">
              Configurações
            </Link>{" "}
            antes de criar planos.
          </p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum plano cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Categorias</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    {formatCurrency(plan.price)}
                    <span className="text-muted-foreground">
                      {" "}
                      / {BILLING_CYCLE_LABEL[plan.billing_cycle].toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {plan.session_limit}x por {SESSION_PERIOD_LABEL[plan.session_period]}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.plan_schedule_categories.map((pc) =>
                        pc.schedule_category ? (
                          <Badge key={pc.schedule_category.id} variant="secondary">
                            {pc.schedule_category.name}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={plan.active}
                      disabled={isPending}
                      onCheckedChange={(checked) => toggleActive(plan, checked)}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <PlanDialog
                      organizationId={organizationId}
                      categories={categories}
                      plan={plan}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => remove(plan)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
