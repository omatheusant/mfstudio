"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { updateStudentNotes, type ActionState } from "@/features/students/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NotesForm({
  organizationId,
  studentId,
  notes,
}: {
  organizationId: string;
  studentId: string;
  notes: string | null;
}) {
  const boundAction = updateStudentNotes.bind(null, organizationId, studentId);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await boundAction(prevState, formData);
      if (result?.success) toast.success("Observações salvas.");
      return result;
    },
    undefined as ActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="notes"
        defaultValue={notes ?? ""}
        rows={6}
        placeholder="Anotações internas sobre o aluno — visíveis apenas para a equipe."
      />
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar observações"}
      </Button>
    </form>
  );
}
