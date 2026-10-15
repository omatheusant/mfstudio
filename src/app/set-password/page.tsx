import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";

import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = {
  title: "Defina sua senha — MF Studio",
};

export default async function SetPasswordPage() {
  await requireUser();

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          M
        </span>
        MF STUDIO
      </div>
      <div className="w-full max-w-sm">
        <SetPasswordForm />
      </div>
    </div>
  );
}
