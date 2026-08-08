"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteScheduleCategory,
  setScheduleCategoryActive,
} from "@/features/schedules/actions";
import type { ScheduleCategoryRow } from "@/features/schedules/queries";
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

import { ScheduleCategoryDialog } from "./schedule-category-dialog";

export function ScheduleCategoriesPanel({
  organizationId,
  categories,
}: {
  organizationId: string;
  categories: ScheduleCategoryRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function toggleActive(category: ScheduleCategoryRow, active: boolean) {
    startTransition(async () => {
      try {
        await setScheduleCategoryActive(organizationId, category.id, active);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
      }
    });
  }

  function remove(category: ScheduleCategoryRow) {
    startTransition(async () => {
      try {
        await deleteScheduleCategory(organizationId, category.id);
        toast.success("Categoria removida.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Categorias de horário</CardTitle>
          <CardDescription>
            Agrupam os horários (ex.: Premium/Alternativo). Planos definem a
            quais categorias cada aluno tem acesso.
          </CardDescription>
        </div>
        <ScheduleCategoryDialog
          organizationId={organizationId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Nova categoria
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma categoria cadastrada ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.active}
                      disabled={isPending}
                      onCheckedChange={(checked) => toggleActive(category, checked)}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <ScheduleCategoryDialog
                      organizationId={organizationId}
                      category={category}
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
                      onClick={() => remove(category)}
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
