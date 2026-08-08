import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-muted/40 px-6 text-center">
      <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          E
        </span>
        ELEVO FIT
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Gestão completa para studios de treinamento personalizado
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Alunos, planos, horários, reservas, check-in, presença e
          financeiro — em um só lugar, sem planilhas.
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="lg" render={<Link href="/signup">Criar meu Studio</Link>} />
        <Button size="lg" variant="outline" render={<Link href="/login">Entrar</Link>} />
      </div>
    </div>
  );
}
