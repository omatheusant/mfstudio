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
