# MF Studio

Sistema de gestão sob medida para o **MF Studio** — alunos, planos,
horários, reservas, check-in, presença e financeiro em um só lugar. Não é
mais vendido como SaaS multi-tenant genérico: o cadastro público
(`/signup`) foi fechado e a marca do produto é a do próprio cliente.

O banco ainda modela tudo por `organization` (com isolamento via RLS) —
isso não é sobre suportar múltiplos clientes, é a mesma técnica de
autorização por papel (OWNER/ADMIN/PROFESSOR/STUDENT) que o produto já
usava, mantida porque remover teria custo/risco sem nenhum ganho real para
um sistema de cliente único.

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
| 2 | Configurações da organização, categorias de horário, horários (`schedule_slots`) | ✅ |
| 3 | Planos (`plans`, categorias permitidas) | ✅ |
| 4 | CRUD de alunos + assinaturas (`students`, `subscriptions`) | ✅ |
| 5 | Agenda e reservas (`bookings`, com proteção de concorrência) | ✅ |
| 6 | Check-in e presença (`checkins`) | ✅ |
| 7 | Financeiro e inadimplência (`payments`, bloqueio de reserva) | ✅ |
| 8 | Dashboard administrativo (indicadores + agenda do dia) | ✅ |
| 9 | Portal do aluno (home consolidada + Meu perfil) | ✅ |
| 10 | Painel de TV (`/studio/[slug]/display`, público) | ✅ |
| 11 | Testes das regras críticas, seed completo, documentação final | ⚠️ ver nota |

> **Nota sobre a Fase 11**: os testes de integração (`tests/`, seção
> [Testes](#testes)) estão escritos cobrindo as 11 regras críticas da
> seção 44 do briefing, mas **não foram executados contra um Supabase
> real neste ambiente** — o ambiente de desenvolvimento usado para
> construir o projeto não tinha Docker (então nada de Supabase local)
> nem credenciais de um projeto hospedado. Escrevendo os testes,
> encontrei e corrigi um bug real de timezone em `create_booking()` (ver
> `docs/business-rules.md`), o que dá alguma confiança de que a lógica
> foi revisada com cuidado — mas "escrito e revisado" não é o mesmo que
> "executado e verde". Rode `npm test` com suas próprias credenciais
> antes de confiar nisso para produção.

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

   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → **service_role**)
   é necessária a partir da Fase 4: cadastrar um aluno convida um usuário
   real do Supabase Auth, o que só a API admin consegue fazer (ver
   `src/lib/supabase/admin.ts`). Sem ela, o resto do app funciona
   normalmente — só o cadastro de alunos retorna um erro claro pedindo
   para configurá-la.

4. Em **Authentication → URL Configuration**, adicione
   `http://localhost:3000/auth/confirm` às *Redirect URLs* (necessário
   para o link de confirmação de e-mail do primeiro `OWNER` funcionar).
   Em produção, adicione também a URL do seu domínio — ver
   [Deploy](#deploy).

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

`supabase/seed.sql` cria a organização **MF Studio** com 7 usuários de
teste (senha `elevofit123` para todos):

| E-mail | Papel |
| --- | --- |
| `owner@mfstudio.dev` | OWNER |
| `admin@mfstudio.dev` | ADMIN |
| `professor@mfstudio.dev` | PROFESSOR |
| `aluno@mfstudio.dev` | STUDENT — plano Ouro, ativo |
| `maria.silva@mfstudio.dev` | STUDENT — plano Bronze Alternativo, ativo |
| `pedro.santos@mfstudio.dev` | STUDENT — plano Prata, aluno inativo |
| `beatriz.costa@mfstudio.dev` | STUDENT — plano Diamante, ativo |

```bash
npx supabase db reset   # local: aplica migrations + seed.sql automaticamente
```

Em um projeto hospedado de **desenvolvimento** (nunca em produção), cole o
conteúdo de `supabase/seed.sql` no SQL Editor — ele roda como `postgres` e
tem os privilégios necessários para inserir usuários de teste diretamente.

> `supabase/seed.sql` cresce a cada fase: hoje cria a organização, os 7
> usuários (3 equipe + 4 alunos com assinaturas), as configurações
> padrão, os horários (categorias Premium/Alternativo, segunda a sexta),
> os 8 planos do MF Studio, algumas reservas futuras, duas reservas
> passadas com presença registrada (uma presente, uma falta) e alguns
> pagamentos (incluindo um atrasado, para testar inadimplência).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

- Não há cadastro público — a organização MF Studio já existe (via seed em
  dev, ou criada manualmente em produção) e todo mundo além do primeiro
  `OWNER` é cadastrado pela equipe. Em **Alunos → Novo aluno**, quem
  cadastra define o e-mail e a senha do aluno (nenhum e-mail é enviado —
  o Supabase não tem SMTP de produção configurado neste projeto; a
  equipe repassa as credenciais diretamente) e cria uma conta real do
  Supabase Auth — precisa de `SUPABASE_SERVICE_ROLE_KEY` configurada.
- **Usar o MF Studio de exemplo**: rode o seed e acesse `/login` com
  qualquer um dos e-mails da tabela acima. Como `owner@mfstudio.dev`/
  `admin@mfstudio.dev`, o **Dashboard** já mostra indicadores reais de
  negócio (alunos ativos/inadimplentes, receita, ocupação); veja a
  ocupação do dia em **Agenda** e marque presença/falta por lá, e
  gerencie cobranças em **Pagamentos** (a Maria já entra como
  inadimplente); como aluno (`aluno@mfstudio.dev`, por exemplo), a home
  já mostra seu plano, sessões usadas e próxima aula — reserve uma aula,
  faça check-in no dia (dentro da janela configurada em Configurações →
  Agenda e financeiro) e veja suas cobranças, tudo a partir dos botões
  da home.
- **Painel de TV**: acesse `/studio/mf-studio/display` (sem login) — ou
  clique em "Abrir painel de TV" no Dashboard.

## Variáveis de ambiente

Ver [`.env.example`](.env.example).

## Scripts

```bash
npm run dev      # ambiente de desenvolvimento (Turbopack)
npm run build    # build de produção
npm run start    # serve o build de produção
npm run lint     # ESLint
npm test         # testes de integração das regras críticas (ver Testes)
```

## Testes

As regras críticas do produto (seção 44 do briefing — sessões,
capacidade/concorrência, cancelamento, inadimplência, autorização,
isolamento multi-tenant) são testadas com testes de **integração** que
rodam contra um Supabase real, não mocks — ver
[`tests/README.md`](tests/README.md) para pré-requisitos e detalhes.
Requer `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` (além das outras
variáveis) e as migrations + seed aplicadas.

```bash
npm test
```

## Deploy

1. **Supabase**: crie/linke o projeto de produção e aplique as migrations (`npx supabase db push`). **Não** rode `supabase/seed.sql` em produção.
2. **Vercel**: importe o repositório, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (URL de produção) e `SUPABASE_SERVICE_ROLE_KEY` (necessária para cadastrar alunos — Project Settings → API → **service_role**, nunca a mesma coisa que a anon key) nas variáveis de ambiente do projeto, e faça o deploy.
3. No painel do Supabase, em **Authentication → URL Configuration**, adicione a URL de produção (`https://seu-dominio.com/auth/confirm`) às *Redirect URLs* — necessário para o link de confirmação de e-mail do primeiro `OWNER`.

## Estrutura do projeto

```text
src/
├── app/
│   ├── (auth)/                    # /login — pública (sem cadastro público)
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx           # dashboard (equipe) / home do portal (aluno)
│   │       ├── students/          # lista + detalhe (CRUD de alunos e assinaturas)
│   │       ├── plans/             # CRUD de planos
│   │       ├── agenda/            # ocupação do dia + lista de alunos por horário (equipe)
│   │       ├── bookings/          # reservar aula + minhas reservas (aluno)
│   │       ├── payments/          # cobranças (equipe) / meus pagamentos (aluno)
│   │       ├── profile/           # meu perfil (todos os papéis)
│   │       └── settings/          # Studio, agenda/financeiro, categorias, horários
│   ├── auth/confirm/              # route handler de confirmação de e-mail / convite
│   ├── onboarding/                # criação da organização (primeiro acesso)
│   ├── set-password/              # primeira senha de usuários convidados (alunos)
│   └── studio/[slug]/display/     # painel de TV — público, sem login
├── components/
│   ├── layout/                    # sidebar, menu do usuário
│   └── ui/                        # shadcn/ui (gerado — não editar à mão)
├── features/                      # lógica de domínio por módulo
│   ├── organizations/              # organização + organization_settings
│   ├── schedules/                  # categorias + horários
│   ├── plans/                      # planos + categorias permitidas
│   ├── students/                   # alunos + assinaturas (criação via admin API, sem envio de e-mail)
│   ├── bookings/                   # reservas (RPCs create_booking/cancel_booking)
│   ├── checkins/                   # presença (RPCs student_checkin/mark_attendance)
│   ├── payments/                   # pagamentos + view payments_with_status (inadimplência)
│   ├── dashboard/                  # indicadores de negócio (agrega os módulos acima)
│   ├── profile/                    # edição do próprio perfil
│   └── display/                    # RPCs públicas do painel de TV (dados mínimos)
├── lib/
│   ├── auth/                      # DAL (data access layer) + Server Actions de auth
│   ├── constants/                  # opções fixas de UI (dias da semana, fusos, planos)
│   ├── supabase/                   # clients Supabase (browser/server/admin) e proxy
│   └── validations/                # esquemas Zod
├── types/database.ts              # espelho do schema do Supabase
└── proxy.ts                       # equivalente ao middleware no Next.js 16
supabase/
├── migrations/          # SQL versionado
└── seed.sql             # dados de desenvolvimento (MF Studio)
tests/                   # testes de integração (Fase 11) — ver tests/README.md
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
