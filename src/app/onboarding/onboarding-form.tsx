"use client";

import { useActionState, useState } from "react";

import { createOrganization } from "@/lib/auth/actions";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createOrganization, undefined);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crie seu Studio</CardTitle>
        <CardDescription>
          Você será o proprietário (OWNER) deste Studio. Você poderá
          cadastrar horários, planos, professores e alunos depois.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do Studio</Label>
            <Input
              id="name"
              name="name"
              placeholder="MF Studio"
              required
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Identificador (slug)</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="mf-studio"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Usado em URLs internas. Apenas letras minúsculas, números e
              hífens.
            </p>
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando Studio..." : "Criar Studio"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
