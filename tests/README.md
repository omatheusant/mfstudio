# Testes das regras críticas (Fase 11)

Estes são testes de **integração** contra um Supabase real — as regras
testadas (limite de sessões, capacidade/concorrência, janela de
cancelamento, inadimplência, RLS por papel, isolamento multi-tenant)
vivem inteiramente no Postgres (RPCs, RLS, triggers). Não há nada
significativo para testar com mocks; um teste que não fala com o banco
não prova que a RLS funciona.

Cobrem, na ordem de prioridade da seção 44 do briefing do produto:

| Arquivo | Regras |
| --- | --- |
| `01-sessions-and-plan-compatibility.test.ts` | cálculo de sessões, reserva, bloqueio por limite, compatibilidade de plano/horário |
| `02-capacity-and-concurrency.test.ts` | bloqueio por capacidade + proteção contra overbooking em reservas simultâneas |
| `03-cancellation-window.test.ts` | cancelamento dentro e fora da janela |
| `04-overdue-and-booking-block.test.ts` | inadimplência (calculada) + bloqueio de reserva por inadimplência |
| `05-authorization.test.ts` | autorização por papel (RLS, não só a UI) |
| `06-multi-tenant-isolation.test.ts` | isolamento entre organizações |

## Pré-requisitos

1. Um projeto Supabase (pode ser o mesmo de desenvolvimento) com as
   migrations aplicadas (`npx supabase db push` ou colando no SQL
   Editor — ver README principal).
2. `supabase/seed.sql` rodado nesse projeto — os testes usam os usuários
   e planos do MF Studio seedados lá (`owner@mfstudio.dev`, o plano
   Ouro do João, etc.).
3. `.env.local` preenchido com `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` **e** `SUPABASE_SERVICE_ROLE_KEY` — a
   service role é necessária aqui (só aqui, nunca no app em si) para
   criar/remover os alunos e organizações descartáveis que os testes de
   capacidade, cancelamento, inadimplência e isolamento multi-tenant
   precisam para não depender de estado exato do seed.

**Nunca aponte isso para um projeto de produção.** Os testes criam
organizações, alunos, horários e reservas reais (com nomes prefixados
`Teste .../elevo-fit-tests.dev`) e fazem limpeza best-effort ao final,
mas não são desenhados para rodar contra dados de verdade.

## Rodando

```bash
npm test
```

Sem as variáveis de ambiente acima, os testes falham imediatamente com
uma mensagem explicando o que falta — isso é intencional
(`tests/vitest.setup.ts`), não um bug. Estes testes **não** rodam em
`npm run build` nem em CI por padrão — são integração, não unitários, e
exigem infraestrutura real.

## Como cada regra é verificada

- **Concorrência (o ponto mais enfatizado do briefing, seção 39)**: o
  teste de capacidade cria um horário descartável com capacidade 2 e
  dispara 3 tentativas de `create_booking()` **simultâneas**
  (`Promise.all`), depois confere tanto as respostas quanto a contagem
  real no banco — exatamente o cenário "duas pessoas disputando a
  última vaga" que a regra existe para prevenir.
- **Fuso horário**: os testes de janela de cancelamento usam
  `Intl.DateTimeFormat` para calcular "agora" no fuso da organização
  (`America/Sao_Paulo`), nunca no fuso de onde os testes rodam — ver
  `pointInOrgTimezone` em `helpers.ts`. Foi assim que encontramos e
  corrigimos um bug real: `create_booking()` comparava a data pedida
  contra `current_date` do Postgres (UTC), não contra o fuso da
  organização — ver `supabase/migrations/20260808200001_fix_create_booking_timezone.sql`
  e `docs/business-rules.md`.
- **Autorização e isolamento**: todos os testes assinam sessões de
  verdade (`supabase.auth.signInWithPassword`) com a chave `anon` — a
  mesma coisa que o navegador usa. A `service role` só aparece para
  criar/remover a infraestrutura descartável de cada teste
  (organizações, alunos, horários), nunca para fazer as asserções em si
  — testar com a service role provaria a lógica da aplicação, não a RLS.
