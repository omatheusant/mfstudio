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

## O que ainda NÃO existe (não confundir com "planejado para nunca existir")

Alunos, professores (CRUD dedicado), planos, horários, reservas, check-in,
presença, pagamentos, inadimplência, dashboard operacional e painel de TV
chegam nas fases 2–10 — ver README. Nenhuma tela atual finge que essas
funcionalidades existem.
