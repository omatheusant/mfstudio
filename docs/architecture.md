# Arquitetura

## Visão geral

ELEVO FIT é um monólito Next.js (App Router). Não há backend separado:
mutações passam por **Server Actions**, integrações HTTP externas (se
algum dia necessárias) por **Route Handlers**, e toda persistência é
**Supabase Postgres**, acessado com a chave anônima e protegido por Row
Level Security (RLS) — nunca com a service role key a partir do código que
atende requisições de usuário.

```text
Browser
  │
  ├─ Server Components / Server Actions ──▶ Supabase (anon key, RLS)
  │
  └─ proxy.ts (equivalente ao middleware) ──▶ refresh de sessão + redirect
                                                 otimista (UX apenas)
```

Três camadas de segurança, cada uma com uma responsabilidade diferente —
nenhuma delas é suficiente por si só:

1. **`src/proxy.ts`** (renomeado de `middleware.ts` no Next.js 16): roda em
   toda requisição, mantém o cookie de sessão do Supabase atualizado, e
   faz um redirect *otimista* (usuário deslogado tentando abrir
   `/dashboard`, usuário logado tentando abrir `/login`). É só UX — nunca a
   única barreira.
2. **DAL (`src/lib/auth/dal.ts`)**: toda Server Action, Route Handler e
   Server Component que precisa saber "quem é o usuário" e "a que
   organização/papel ele pertence" passa por aqui. É aqui que
   `getClaims()` verifica o JWT e que a organização/role do usuário são
   derivadas — nunca de um valor enviado pelo cliente.
3. **RLS no Postgres**: a barreira final. Mesmo que a camada acima tenha um
   bug, uma query para a tabela errada simplesmente não retorna linhas de
   outra organização. Ver [`database.md`](database.md).

Esse padrão (DAL + RLS, proxy como otimização de UX) segue a recomendação
oficial do Next.js 16 para segurança de dados — ver
`node_modules/next/dist/docs/01-app/02-guides/data-security.md` e
`.../authentication.md` ("Optimistic checks with Proxy").

## Multi-tenancy

- `organizations` é a raiz de cada tenant (um Studio).
- `organization_members` é a única fonte de verdade sobre "quem pertence a
  qual organização, com qual papel". Toda função de autorização (RLS ou
  DAL) deriva desta tabela e de `auth.uid()` — nunca de um `organization_id`
  recebido do cliente.
- Um novo tenant é criado exclusivamente pela função `create_organization()`
  (SECURITY DEFINER), que insere a organização e a membership `OWNER` do
  usuário autenticado numa única transação. Não existe (e não deve existir)
  um caminho para inserir em `organizations` fora dessa função ou do seed.
- **Critério de sucesso**: um segundo Studio deve conseguir operar sem
  qualquer alteração de código — apenas criando sua própria organização,
  categorias de horário, planos etc. Nada específico do MF Studio está
  hardcoded na lógica da aplicação.

## Papéis (roles)

`OWNER`, `ADMIN`, `PROFESSOR`, `STUDENT` — ver
[`business-rules.md`](business-rules.md) para o que cada um pode fazer.
Papéis são armazenados por membership (`organization_members.role`), então
o mesmo usuário pode, em tese, ter papéis diferentes em organizações
diferentes.

## Estrutura de código

```text
src/
├── app/            # rotas (App Router)
├── features/       # lógica de domínio por módulo (queries, mutations)
├── lib/
│   ├── auth/       # DAL + Server Actions de autenticação
│   ├── supabase/   # clients (browser, server, admin)
│   └── validations/# esquemas Zod
├── components/ui/  # shadcn/ui
└── types/database.ts
```

`features/<domínio>/` é onde a lógica de negócio de cada módulo (alunos,
planos, agenda, reservas, check-ins, pagamentos, dashboard) deve viver,
separada por domínio dentro do monólito — sem microserviços, mas também
sem tudo misturado em `app/`.

## Decisões deliberadas (para não reabrir sem motivo)

- **Sem Prisma.** Migrations SQL puras em `supabase/migrations/`, versionadas.
- **Sem Redis, sem filas, sem microserviços.** O MVP não precisa.
- **Sem gateway de pagamento.** `payments` é controle financeiro manual
  (fase 7) — não há Stripe/Mercado Pago/PIX automático no MVP.
- **`proxy.ts`, não `middleware.ts`.** O Next.js 16 renomeou o arquivo; ver
  nota no README.
- **shadcn/ui usa Base UI (`@base-ui/react`), não Radix.** Componentes
  polimórficos usam a prop `render` (ex.: `<Button render={<Link .../>} />`),
  não `asChild`.
- **Zod 4**: validadores de string usam a forma `z.email()` (topo do
  módulo), não `z.string().email()`.
