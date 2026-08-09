# Banco de dados

Migrations em `supabase/migrations/`, aplicadas em ordem pelo nome do
arquivo (`AAAAMMDDHHMMSS_descrição.sql`). Este documento cresce junto com
as migrations — cada fase acrescenta suas tabelas aqui.

## Esquema (Fase 1)

```text
organizations
    id, name, slug (unique), logo_url, phone, email, address,
    timezone (default 'America/Sao_Paulo'), created_at, updated_at

profiles                          -- 1:1 com auth.users
    id (= auth.users.id), full_name, avatar_url, phone,
    created_at, updated_at
    -- (Fase 4 adiciona a coluna `email` — ver seção "Esquema (Fase 4)")

organization_members              -- N:N entre profiles e organizations
    id, organization_id → organizations, user_id → profiles,
    role ('OWNER'|'ADMIN'|'PROFESSOR'|'STUDENT'),
    status ('ACTIVE'|'INACTIVE'), created_at, updated_at
    unique (organization_id, user_id)
```

Toda tabela de negócio futura (planos, horários, alunos, reservas,
check-ins, pagamentos...) terá uma coluna `organization_id` não nula
referenciando `organizations(id)`, seguindo exatamente este padrão.

## Esquema (Fase 2)

```text
organization_settings             -- 1:1 com organizations
    organization_id (pk, → organizations),
    default_capacity (default 8),
    cancellation_window_minutes (default 120),
    checkin_open_minutes_before (default 60),
    checkin_close_minutes_after (default 15),
    block_booking_when_overdue (default true),
    created_at, updated_at

schedule_categories
    id, organization_id → organizations, name, description, active,
    created_at, updated_at
    unique (organization_id, name)

schedule_slots
    id, organization_id → organizations,
    schedule_category_id → schedule_categories (on delete restrict),
    day_of_week (0=domingo … 6=sábado, convenção do Postgres/JS),
    start_time, end_time (check end_time > start_time),
    capacity (check > 0), active, created_at, updated_at
    unique (organization_id, day_of_week, start_time, end_time)
```

Todo `organization_settings` é criado automaticamente por
`create_organization()` (nunca fica sem linha) — ver
`20260808130005_extend_create_organization.sql`. `schedule_slots.capacity`
e `schedule_category_id` são sempre configuração por linha, nunca uma
constante no código (ver `docs/business-rules.md` §"Regra de ouro").

`schedule_slots.day_of_week` usa `0 = domingo … 6 = sábado` — o mesmo que
`Date.getDay()` no JS e `extract(dow from date)` no Postgres, para que a
Fase 5 (reservas) nunca precise de uma tabela de conversão ao comparar um
horário com uma data de calendário real.

## Esquema (Fase 3)

```text
plans
    id, organization_id → organizations, name, description,
    price numeric(10,2), billing_cycle ('MONTHLY'|'WEEKLY'|'QUARTERLY'
      |'YEARLY'|'CUSTOM', default 'MONTHLY'),
    session_limit (check > 0), session_period ('WEEK'|'MONTH'),
    active, created_at, updated_at
    unique (organization_id, name)

plan_schedule_categories          -- N:N entre plans e schedule_categories
    plan_id → plans (on delete cascade),
    schedule_category_id → schedule_categories (on delete restrict),
    created_at
    primary key (plan_id, schedule_category_id)
```

`billing_cycle` já aceita os 5 valores da especificação desde a Fase 3 —
"estrutura preparada" significa a coluna já suportar isso agora, não que
a UI esconda as opções; o MF Studio simplesmente só usa `MONTHLY` no seed.

`plan_schedule_categories` tem um **trigger** (`validate_plan_schedule_category`)
que impede vincular um plano de uma organização a uma categoria de
horário de outra — mesmo que a policy de RLS já exija que o usuário seja
`OWNER`/`ADMIN` do plano, nada nela valida sozinha que a categoria
referenciada pertence à mesma organização. Isso é tratado como uma regra
crítica de isolamento multi-tenant, não como validação de formulário.

A função `sync_plan_categories(plan_id, category_ids[])` substitui o
conjunto inteiro de categorias de um plano em uma única chamada (em vez de
apagar e reinserir do cliente em duas idas ao banco, que poderiam falhar
parcialmente). Ela roda como quem a chamou (não é `SECURITY DEFINER`), então
RLS e o trigger acima continuam valendo normalmente.

## Esquema (Fase 4)

```text
profiles.email                    -- coluna nova, não uma tabela nova
    Denormalizada de auth.users.email via trigger (handle_new_user +
    handle_user_email_change), porque auth.users não é consultável via
    PostgREST/RLS. A aplicação nunca escreve esta coluna diretamente.

students
    id, organization_id → organizations, profile_id → profiles
      (on delete restrict), status ('ACTIVE'|'INACTIVE'), notes,
    created_at, updated_at
    unique (organization_id, profile_id)

subscriptions
    id, organization_id → organizations, student_id → students
      (on delete cascade), plan_id → plans (on delete restrict),
    start_date, end_date, status ('ACTIVE'|'INACTIVE'|'CANCELLED'
      |'SUSPENDED'), price numeric(10,2) (congelado na criação),
    billing_day (1-31, opcional), created_at, updated_at
    unique index parcial: no máximo 1 assinatura ACTIVE por aluno
```

`students` é deliberadamente separada de `profiles` (identidade) e de
`organization_members` (papel/acesso): nome/telefone/e-mail moram em
`profiles`; status de negócio e observações internas moram em `students`.
Um aluno **sempre** tem login (ver "Convite de aluno" abaixo) — não existe
"cadastro no papel" sem conta.

`subscriptions.price` é copiado de `plans.price` na criação e nunca
muda retroativamente se o preço do plano mudar depois — ver
`docs/business-rules.md`.

Duas triggers de defesa em profundidade, no mesmo espírito de
`validate_plan_schedule_category` (Fase 3):

- `validate_subscription`: garante que `plan_id` e `student_id` de uma
  assinatura pertencem à mesma `organization_id` da própria assinatura.
- O índice único parcial `subscriptions_one_active_per_student` garante
  no banco que um aluno nunca tem duas assinaturas `ACTIVE`
  simultaneamente — a Fase 5 depende disso para calcular sessões
  disponíveis sem ambiguidade.

### Convite de aluno (por que a service role aparece aqui)

`auth.users` não tem um equivalente RLS — criar um novo usuário de
autenticação só é possível via `auth.admin.*`, que exige a service role
key. `features/students/actions.ts#createStudent` é o único lugar do
app que usa `src/lib/supabase/admin.ts`, e só para a chamada
`inviteUserByEmail`; toda gravação seguinte (`organization_members`,
`students`, `subscriptions`) usa a sessão normal do `OWNER`/`ADMIN` que
está cadastrando o aluno, passando por RLS como qualquer outra escrita.
Se qualquer passo depois do convite falhar, o usuário de autenticação
recém-criado é removido (`auth.admin.deleteUser`) para não deixar contas
órfãs.

## Esquema (Fase 5)

```text
bookings
    id, organization_id → organizations, student_id → students
      (on delete cascade), schedule_slot_id → schedule_slots
      (on delete restrict), date,
    status ('RESERVED'|'CANCELLED'|'CANCELLED_LATE'|'COMPLETED'|'NO_SHOW'),
    created_at, cancelled_at, cancelled_by → profiles, updated_at
    unique index parcial: no máximo 1 RESERVED por (student_id,
      schedule_slot_id, date)
```

`bookings` nunca é escrita diretamente pelo código da aplicação — a
única forma suportada de criar ou cancelar uma reserva é através das
RPCs abaixo, exatamente como `organizations` só existe via
`create_organization()`.

### RPCs `create_booking` / `cancel_booking`

Toda a "Regra central de reservas" (seção 11 do briefing do produto)
está implementada em `20260808160003_rpc_bookings.sql`, numa função só,
para nunca duplicar ou dessincronizar a regra entre banco e aplicação.
`create_booking(p_student_id, p_schedule_slot_id, p_date)` verifica, nesta
ordem: horário existe/ativo, data bate com o `day_of_week` do horário,
data não é passada, autorização (o próprio aluno ou `OWNER`/`ADMIN` do
horário), aluno `ACTIVE`, assinatura `ACTIVE`, categoria do horário
permitida pelo plano, limite de sessões do período (semana ISO
segunda-domingo, ou mês corrido) ainda não atingido, nenhuma reserva
conflitante (horário sobreposto) na mesma data, e por fim capacidade.

**Proteção contra overbooking por concorrência** (seção 39 do briefing):
a função começa travando a linha de `schedule_slots` com
`SELECT ... FOR UPDATE`. Isso serializa qualquer tentativa concorrente de
reservar aquele horário — a segunda transação simplesmente espera a
primeira terminar antes de contar as reservas existentes, então nunca é
possível duas transações lerem "7/8 vagas" ao mesmo tempo e ambas
inserirem a 8ª e a 9ª reserva. Testado explicitamente na Fase 11 (ver
`docs/business-rules.md`).

`cancel_booking(p_booking_id)` decide `CANCELLED` vs `CANCELLED_LATE`
comparando `now()` com o instante de início da aula
(`bookings.date` + `schedule_slots.start_time`, interpretado no fuso
horário **da organização** — nunca o do servidor ou do navegador) menos
`organization_settings.cancellation_window_minutes`.

Ambas as funções são `SECURITY INVOKER` (padrão): rodam com os
privilégios de quem chamou, então a RLS de `schedule_slots`/`students`/
`subscriptions`/`bookings` continua valendo em cada instrução lá dentro
— é uma segunda camada de proteção independente das checagens explícitas
na função, não uma redundância inútil.

## Funções auxiliares de RLS

Ficam em `20260808120004_rls_helper_functions.sql`. Todas são
`SECURITY DEFINER` + `SET search_path = public` — isso é o que evita o erro
clássico do Postgres *"infinite recursion detected in policy for relation
organization_members"* que aconteceria se uma policy em
`organization_members` fizesse uma subquery direta na própria tabela sob
RLS.

- `is_org_member(organization_id) → boolean`
- `has_role_in_org(organization_id, roles[]) → boolean`
- `my_organization_ids() → setof uuid`
- `shares_org_with(user_id) → boolean` (usada pela policy de `profiles`)

Qualquer policy nova deve reusar essas funções em vez de escrever a
subquery à mão.

## RPC `create_organization`

Único caminho para criar um tenant. Recebe `p_name`, `p_slug`,
`p_timezone`; insere a organização e a membership `OWNER` do
`auth.uid()` atomicamente. Ver `20260808120006_rpc_create_organization.sql`.

## Validação de isolamento multi-tenant

Ao adicionar qualquer tabela nova, valide manualmente (ou em teste
automatizado — fase 11) que um membro da organização A não vê linhas da
organização B. Exemplo, usando dois usuários de teste em organizações
diferentes (troque os e-mails/senha pelos do seu seed):

```sql
-- Logado como usuário da organização A (via cliente anon key + JWT dele):
select * from organizations;                 -- só deve retornar A
select * from organization_members;          -- só linhas de A
select * from profiles;                      -- só o próprio + peers de A

-- Tentativa direta de vazamento: usando o id real de uma organização B
-- (obtido, por exemplo, com a service role key em uma query administrativa),
-- um usuário de A NUNCA deve conseguir:
select * from organizations where id = '<uuid da organização B>';
-- ⇒ deve retornar 0 linhas quando executado com a sessão do usuário de A.
```

Se qualquer uma dessas queries retornar dados de outra organização, é bug
de RLS — trate como incidente de segurança, não como bug de UI.

## Seed

`supabase/seed.sql` cria a organização MF Studio e 4 usuários (um por
papel). Insere diretamente em `auth.users`/`auth.identities` (senha
`elevofit123` via `crypt()`/`pgcrypto`) para permitir login imediato sem
passar pelo fluxo de confirmação de e-mail. **Nunca rode este script em um
projeto de produção.**

Desde a Fase 2, também semeia `organization_settings` (valores padrão),
as categorias **Premium**/**Alternativo** e os horários de segunda a
sexta descritos na seção 6 do briefing do produto — capacidades (8 para
Premium, 12 para Alternativo) são apenas dados ilustrativos de seed, não
uma regra do sistema.

Desde a Fase 3, também semeia os 8 planos do MF Studio (Bronze/Prata/
Ouro/Diamante, cada um em versão Premium e Alternativo) já vinculados à
categoria correspondente.

Desde a Fase 4, também semeia 4 alunos com assinaturas (um por plano
Ouro/Bronze Alternativo/Prata/Diamante) — inseridos diretamente como
`postgres`, não através do fluxo de convite real (que precisa da service
role key rodando fora do SQL Editor). Alunos cadastrados pela UI depois
do seed passam pelo fluxo de convite de verdade.

Desde a Fase 5, também semeia algumas reservas futuras (para os alunos
com plano ativo, num horário compatível com sua categoria) — inseridas
diretamente na tabela, não via `create_booking()`, porque o seed roda
fora de uma sessão de usuário (`auth.uid()` seria nulo). A trigger
`validate_booking` ainda roda normalmente e funciona como um teste de
sanidade sobre os dados do próprio seed.
