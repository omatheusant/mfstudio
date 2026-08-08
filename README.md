# ELEVO FIT

Plataforma SaaS multi-tenant para gestão de studios de treinamento
personalizado, academias boutique e personal trainers. O **MF Studio** é o
primeiro tenant piloto — o produto em si é genérico e configurável para
qualquer Studio.

> **Status do projeto**: em construção, por fases. Veja [Progresso](#progresso)
> abaixo para o que já existe e o que ainda não foi implementado. Nenhuma
> tela deste projeto mostra dados fictícios fora do seed de desenvolvimento
> nem funcionalidades "em breve" — o que estiver no menu, funciona.

## Stack

- **Frontend/App**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), React 19.
- **Backend**: Server Actions + Route Handlers do próprio Next.js — sem backend separado.
- **Banco/Auth/Storage**: Supabase (PostgreSQL, Auth, Storage), acessado via `@supabase/ssr` e `@supabase/supabase-js`. Sem Prisma — migrations SQL versionadas em `supabase/migrations/`.
- **Validação**: Zod.
- **Deploy**: Vercel (app) + Supabase (banco/auth), pensado para operar nos planos gratuitos.

## Progresso

| Fase | Conteúdo | Status |
| --- | --- | --- |
| 1 | Fundação: Next.js, Supabase Auth, `organizations`/`profiles`/`organization_members`, RLS, proxy de sessão, criação de Studio (onboarding) | ✅ |
| 2 | Configurações da organização, categorias de horário, horários (`schedule_slots`) | ⏳ |
| 3 | Planos e assinaturas | ⏳ |
| 4 | CRUD de alunos | ⏳ |
| 5 | Agenda e reservas (com proteção de concorrência) | ⏳ |
| 6 | Check-in e presença | ⏳ |
| 7 | Financeiro e inadimplência | ⏳ |
| 8 | Dashboard administrativo | ⏳ |
| 9 | Portal do aluno | ⏳ |
| 10 | Painel de TV (`/studio/display`) | ⏳ |
| 11 | Testes das regras críticas, seed completo, documentação final | ⏳ |

## Arquitetura e multi-tenancy

Veja [`docs/architecture.md`](docs/architecture.md) para a visão completa.
Resumo: toda tabela de negócio pertence a uma `organization`; o isolamento
entre tenants é garantido no **banco**, via Row Level Security do
PostgreSQL — nunca apenas no frontend, e nunca confiando em um
`organization_id` vindo do cliente. Veja
[`docs/database.md`](docs/database.md) para o esquema e as queries de
validação de isolamento, e [`docs/business-rules.md`](docs/business-rules.md)
para as regras de negócio já implementadas.

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano free é suficiente para o MVP).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
3. Copie `.env.example` para `.env.local` e preencha:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   `SUPABASE_SERVICE_ROLE_KEY` fica em branco a menos que uma feature
   específica precise dela (ver `src/lib/supabase/admin.ts`) — não é
   necessária para rodar o projeto.

### Rodando as migrations

Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e associe o projeto:

```bash
npx supabase login
npx supabase link --project-ref xxxxx   # o ref aparece na Project URL
npx supabase db push                    # aplica supabase/migrations/*.sql
```

Alternativamente, sem a CLI: abra **SQL Editor** no painel do Supabase e
execute o conteúdo de cada arquivo em `supabase/migrations/`, em ordem
(pelo nome do arquivo, que é sempre `AAAAMMDDHHMMSS_descrição.sql`).

### Rodando o seed de desenvolvimento

`supabase/seed.sql` cria a organização **MF Studio** com 4 usuários de
teste (senha `elevofit123` para todos):

| E-mail | Papel |
| --- | --- |
| `owner@mfstudio.dev` | OWNER |
| `admin@mfstudio.dev` | ADMIN |
| `professor@mfstudio.dev` | PROFESSOR |
| `aluno@mfstudio.dev` | STUDENT |

```bash
npx supabase db reset   # local: aplica migrations + seed.sql automaticamente
```

Em um projeto hospedado de **desenvolvimento** (nunca em produção), cole o
conteúdo de `supabase/seed.sql` no SQL Editor — ele roda como `postgres` e
tem os privilégios necessários para inserir usuários de teste diretamente.

> `supabase/seed.sql` cresce a cada fase: hoje cria só a organização e os 4
> usuários; fases seguintes acrescentam horários, planos, alunos, reservas
> e pagamentos ao mesmo script.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

- **Criar seu próprio Studio**: acesse `/signup`, confirme o e-mail (se a
  confirmação estiver habilitada no seu projeto Supabase) e você será
  levado a `/onboarding` para nomear seu Studio — isso te torna `OWNER`.
- **Usar o MF Studio de exemplo**: rode o seed e acesse `/login` com
  qualquer um dos e-mails da tabela acima.

## Variáveis de ambiente

Ver [`.env.example`](.env.example).

## Scripts

```bash
npm run dev      # ambiente de desenvolvimento (Turbopack)
npm run build    # build de produção
npm run start    # serve o build de produção
npm run lint     # ESLint
```

## Deploy

1. **Supabase**: crie/linke o projeto de produção e aplique as migrations (`npx supabase db push`). **Não** rode `supabase/seed.sql` em produção.
2. **Vercel**: importe o repositório, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` (URL de produção) nas variáveis de ambiente do projeto, e faça o deploy.
3. No painel do Supabase, em **Authentication → URL Configuration**, adicione a URL de produção às *Redirect URLs* (necessário para o link de confirmação de e-mail).

## Estrutura do projeto

```text
src/
├── app/
│   ├── (auth)/          # /login, /signup — públicas
│   ├── (dashboard)/     # painel administrativo — autenticado
│   ├── auth/confirm/    # route handler de confirmação de e-mail
│   └── onboarding/      # criação da organização (primeiro acesso)
├── features/            # lógica de domínio por módulo (organizations, ...)
├── lib/
│   ├── auth/            # DAL (data access layer) + Server Actions de auth
│   ├── supabase/        # clients Supabase (browser/server/admin) e proxy
│   └── validations/     # esquemas Zod
├── types/database.ts    # espelho do schema do Supabase
└── proxy.ts              # equivalente ao middleware no Next.js 16
supabase/
├── migrations/          # SQL versionado
└── seed.sql             # dados de desenvolvimento (MF Studio)
docs/
├── architecture.md
├── database.md
└── business-rules.md
```

## Sobre o Next.js 16

Este projeto usa o Next.js 16, que **renomeou `middleware.ts` para
`proxy.ts`** (mesmo conceito, mesma finalidade — apenas o nome mudou; o
runtime passou a ser exclusivamente Node.js). Veja `src/proxy.ts`. Se você
estiver acostumado com versões anteriores do Next.js, isso não é um
engano — é a convenção atual do framework.
