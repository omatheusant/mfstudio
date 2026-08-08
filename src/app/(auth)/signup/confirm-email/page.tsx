import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirme seu e-mail</CardTitle>
        <CardDescription>
          Enviamos um link de confirmação para o seu e-mail. Abra-o para
          ativar sua conta e continuar a criação do seu Studio.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Não recebeu? Verifique a caixa de spam ou tente criar a conta
        novamente em alguns minutos.
      </CardContent>
    </Card>
  );
}
