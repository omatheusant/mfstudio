import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMemberships, requireUser } from "@/lib/auth/dal";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Configurar organização — MF Studio",
};

export default async function OnboardingPage() {
  await requireUser();

  // Users with an organization already have somewhere to go — no need to
  // create another one from this screen.
  const memberships = await getMemberships();
  if (memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          M
        </span>
        MF STUDIO
      </div>
      <div className="w-full max-w-sm">
        <OnboardingForm />
      </div>
    </div>
  );
}
