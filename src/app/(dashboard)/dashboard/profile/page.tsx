import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Meu perfil — ELEVO FIT",
};

export default async function ProfilePage() {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-muted-foreground">Seus dados pessoais.</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Visíveis para a equipe do seu Studio.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fullName={profile?.full_name ?? null}
            email={user.email}
            phone={profile?.phone ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
