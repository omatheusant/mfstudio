"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setStudentStatus } from "@/features/students/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { StudentStatus } from "@/types/database";

export function StudentStatusSwitch({
  organizationId,
  studentId,
  status,
}: {
  organizationId: string;
  studentId: string;
  status: StudentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    startTransition(async () => {
      try {
        await setStudentStatus(organizationId, studentId, checked ? "ACTIVE" : "INACTIVE");
        toast.success(checked ? "Aluno reativado." : "Aluno desativado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="student-active"
        checked={status === "ACTIVE"}
        disabled={isPending}
        onCheckedChange={toggle}
      />
      <Label htmlFor="student-active" className="font-normal">
        {status === "ACTIVE" ? "Ativo" : "Inativo"}
      </Label>
    </div>
  );
}
