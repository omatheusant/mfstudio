# Regras de negócio

Este documento cresce fase a fase. Só descreve regras **já implementadas**
— para o que ainda está planejado, veja a tabela de progresso no README.

## Papéis e permissões (Fase 1)

| Papel | Pode |
| --- | --- |
| `OWNER` | Tudo dentro da sua organização, incluindo editar dados da organização e gerenciar membros (inclusive promover/remover outros `OWNER`s). |
| `ADMIN` | Editar dados da organização e gerenciar membros — **exceto** conceder ou remover o papel `OWNER` (ação exclusiva de um `OWNER` existente). |
| `PROFESSOR` | Ver a própria organização e seus membros. (Permissões operacionais — aulas, alunos, presença — chegam na Fase 5/6.) |
| `STUDENT` | Ver a própria organização e seus membros. (Portal do aluno chega na Fase 9.) |

Essas regras estão implementadas em **dois lugares que precisam continuar
concordando entre si**:

1. RLS policies em `supabase/migrations/20260808120005_rls_policies.sql`
   (fonte da verdade, aplicada pelo banco independentemente do que o
   código da aplicação faça).
2. `src/lib/auth/dal.ts` (`requireRole`) — usado por Server Actions para
   dar um erro claro antes de sequer tentar a query, em vez de deixar o
   RLS rejeitar silenciosamente.

## Criação de organização (tenant)

- Qualquer usuário autenticado sem organização é levado a `/onboarding`
  para criar a sua. Isso o torna `OWNER` dessa organização.
- Um usuário pode, no modelo de dados, pertencer a mais de uma organização
  (com papéis independentes em cada) — a UI da Fase 1 assume uma
  organização "principal" (a primeira membership retornada), mas nada no
  banco impede múltiplas.
- Não existe (deliberadamente) um fluxo para excluir uma organização no
  MVP.

## Perfis

- Todo usuário autenticado tem exatamente um `profiles`, criado
  automaticamente por um trigger em `auth.users` (não pelo código da
  aplicação) no momento do signup/convite.
- Um usuário só edita o próprio perfil. Só vê o perfil de outro usuário se
  compartilharem pelo menos uma organização ativa em comum.

## Configuração do Studio (Fase 2)

- Dados do Studio (nome, telefone, e-mail, endereço, fuso horário) e as
  configurações de agenda/financeiro (`organization_settings`) só podem
  ser editados por `OWNER`/`ADMIN` — reforçado em três lugares: o item de
  menu "Configurações" nem aparece para `PROFESSOR`/`STUDENT`
  (`app-sidebar.tsx`), a própria página chama `requireRole` no servidor, e
  a RLS de `organizations`/`organization_settings` rejeita a escrita
  independentemente do que a UI faça.
- **Categorias de horário são 100% configuráveis por organização.** Não
  existe "Premium"/"Alternativo" no código — são apenas os nomes que o
  seed do MF Studio escolheu. Qualquer organização cria as categorias que
  quiser (ex.: "Manhã"/"Tarde"/"Noite").
- **Capacidade é por horário, não uma constante do sistema.**
  `organization_settings.default_capacity` é só um valor sugerido ao
  criar um novo horário — cada `schedule_slot.capacity` pode ser
  diferente.
- Uma categoria em uso por algum horário não pode ser excluída (o banco
  rejeita com `on delete restrict`); a UI traduz isso em uma mensagem
  amigável em vez de deixar o erro do Postgres vazar. Desativá-la
  (`active = false`) é sempre possível.
- Janela de cancelamento (`cancellation_window_minutes`) e janela de
  check-in (`checkin_open_minutes_before`/`checkin_close_minutes_after`)
  estão configuráveis desde já, mas só passam a ter efeito quando as
  Fases 5/6 (reservas e check-in) lerem esses valores — configurá-las
  agora não muda comportamento nenhum ainda.
- `block_booking_when_overdue` (default `true`) mesma coisa: gravado e
  editável agora, com efeito a partir da Fase 7.

## Planos (Fase 3)

- Não existe Bronze/Prata/Ouro/Diamante no código — são só os nomes que o
  seed do MF Studio escolheu. Qualquer organização cria os planos que
  quiser, com o preço, ciclo de cobrança e limite de sessões que fizerem
  sentido para ela.
- **O preço fica congelado na assinatura, não no plano.** Isso ainda não
  é relevante na Fase 3 (não existem assinaturas até a Fase 4), mas o
  motivo de `plans.price` existir separado de uma futura
  `subscriptions.price` é justamente esse: se o Ouro passar de R$120 para
  R$130, assinaturas antigas não devem mudar retroativamente (seção 10
  do briefing).
- Um plano só pode ser criado/editado depois que a organização tem pelo
  menos uma categoria de horário — a tela de Planos deixa isso explícito
  em vez de permitir criar um plano "solto" que depois não reserva nada.
- Um plano pode conceder acesso a mais de uma categoria de horário
  simultaneamente (a tabela `plan_schedule_categories` é N:N); o MF
  Studio simplesmente não usa essa flexibilidade no seed — cada plano ali
  aponta para exatamente uma categoria.
- Uma categoria vinculada a algum plano não pode ser excluída
  (`on delete restrict`) — desative-a em vez disso. Mesma regra já valia
  para categoria vinculada a horário (Fase 2).
- Desativar um plano (`active = false`) não afeta assinaturas existentes
  automaticamente — isso só passa a ter sentido prático a partir da Fase 4,
  quando assinaturas existirem.

## O que ainda NÃO existe (não confundir com "planejado para nunca existir")

Alunos, assinaturas, professores (CRUD dedicado), reservas, check-in,
presença, pagamentos, inadimplência, dashboard operacional e painel de TV
chegam nas fases 4–10 — ver README. Nenhuma tela atual finge que essas
funcionalidades existem.
