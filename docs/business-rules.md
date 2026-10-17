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
- Janela de cancelamento (`cancellation_window_minutes`) já tem efeito
  real a partir da Fase 5 (`cancel_booking()` lê esse valor). Janela de
  check-in (`checkin_open_minutes_before`/`checkin_close_minutes_after`)
  segue configurável mas sem efeito até a Fase 6.
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
- Desativar um plano (`active = false`) não cancela assinaturas
  existentes — apenas o impede de ser escolhido em novas assinaturas
  (Fase 4). Quem já está no plano continua nele até uma troca manual.

## Alunos e assinaturas (Fase 4)

- **Cadastrar um aluno cria uma conta de verdade.** Não existe "aluno no
  papel" sem login — cadastrar em Alunos → Novo aluno cria um usuário
  real do Supabase Auth com o e-mail e a senha que `OWNER`/`ADMIN`
  escolherem (`email_confirm: true`, sem e-mail de convite — o Supabase
  não tem SMTP de produção configurado neste projeto, então a equipe
  repassa e-mail/senha ao aluno diretamente), cria a membership
  (`role = 'STUDENT'`) e a assinatura no plano escolhido, tudo em uma
  única ação. Se qualquer etapa falhar depois da criação do usuário, a
  conta criada é removida — não fica usuário órfão sem organização.
- O aluno faz login direto com o e-mail/senha informados pela equipe —
  não há fluxo de confirmação por e-mail nem de troca de senha no
  primeiro acesso.
- **Status do aluno (`students.status`) é independente do status de
  acesso (`organization_members.status`).** Um aluno pode ficar
  `INACTIVE` como cliente (pausou, cancelou) sem perder o login — ver o
  aluno Pedro Santos no seed. O inverso (login desativado, aluno "ativo")
  também é possível, embora incomum na prática.
- **Um aluno tem no máximo uma assinatura `ACTIVE` por vez** — reforçado
  por um índice único parcial no banco, não só pela UI. Trocar de plano
  encerra a assinatura atual (`CANCELLED`, com `end_date`) e cria uma
  nova, na ordem exigida para nunca violar essa garantia.
- **O preço fica congelado na assinatura, não no plano** (`subscriptions.price`,
  copiado de `plans.price` no momento da criação). Se o Ouro passar de
  R$120 para R$130, assinaturas já existentes não mudam retroativamente
  — só a próxima assinatura criada usa o novo preço (a menos que o valor
  seja sobrescrito manualmente na hora de vincular o plano).
- Apenas `OWNER`/`ADMIN` cadastram, editam ou desativam alunos e trocam
  seus planos. Um `STUDENT` só enxerga o próprio registro (nunca o de
  outro aluno) — reforçado por RLS, não só pela UI.
- As abas "Histórico de presença" e "Pagamentos" no detalhe do aluno
  ainda mostram um estado vazio genuíno — passam a existir a partir das
  Fases 6 e 7. "Próximas reservas" já mostra dados reais desde a Fase 5.

## Reservas (Fase 5)

Esta é a regra mais importante do produto (seção 11 do briefing) —
implementada inteiramente no banco, em `create_booking()`, não
espalhada pela aplicação (ver `docs/database.md`). Um aluno só consegue
reservar um horário se, nesta ordem:

1. O horário existe, está ativo, e a data escolhida cai no dia da
   semana certo (nunca reservar uma segunda-feira num horário de terça).
2. A data não é no passado.
3. Quem está reservando é o próprio aluno **ou** um `OWNER`/`ADMIN` da
   organização reservando em nome dele (ex.: aluno que liga pedindo pra
   marcar).
4. O aluno está `ACTIVE` (ver Fase 4).
5. O aluno tem uma assinatura `ACTIVE`.
6. A categoria do horário está entre as categorias permitidas pelo
   plano da assinatura (`plan_schedule_categories`) — o sistema nunca
   mostra como reservável um horário fora do plano; quando aparece na
   lista mesmo assim (para transparência, seção 24 do briefing), vem
   marcado como "Fora do seu plano" e o botão fica desabilitado.
7. O aluno ainda não atingiu o limite de sessões do plano **no período
   atual** — semana ISO (segunda a domingo) ou mês corrente, conforme
   `plans.session_period`. O cálculo sempre conta reservas reais
   (`RESERVED`/`COMPLETED`) do período, nunca um contador solto que
   pudesse dessincronizar.
8. Não há conflito de horário — nenhuma outra reserva `RESERVED` do
   mesmo aluno, na mesma data, cujo intervalo de tempo se sobreponha.
9. Ainda há vaga — `capacidade do horário - reservas RESERVED naquela
   data`.

**Concorrência**: duas pessoas tentando reservar a última vaga ao mesmo
tempo nunca resultam em overbooking — a função trava a linha de
`schedule_slots` (`SELECT ... FOR UPDATE`) antes de contar as reservas
existentes, forçando tentativas concorrentes para o mesmo horário a
serializar. Ver `docs/database.md` e o teste de carga na Fase 11.

**Cancelamento**: só o próprio aluno ou a equipe (`OWNER`/`ADMIN`/
`PROFESSOR`) podem cancelar uma reserva `RESERVED`. Dentro da janela
configurada (`organization_settings.cancellation_window_minutes`, minutos
de antecedência antes do início da aula, calculado no fuso da
organização) o status vira `CANCELLED` e a sessão volta a ficar
disponível para o limite do período; fora da janela, vira
`CANCELLED_LATE` e a sessão continua contando para o limite — exatamente
como a seção 13 do briefing pede.

A Agenda (`/dashboard/agenda`, para `OWNER`/`ADMIN`/`PROFESSOR`) mostra
ocupação por horário e a lista de alunos reservados, com cancelamento
direto. O aluno reserva em `/dashboard/bookings`; a versão com o
dashboard completo do portal (seção 23 do briefing) chega na Fase 9 —
por enquanto o fluxo é funcional, só ainda não visualmente dedicado.

## Check-in e presença (Fase 6)

Duas formas de registrar o que aconteceu numa reserva, ambas gravando um
`checkins` e movendo `bookings.status` para `COMPLETED` (presente) ou
`NO_SHOW` (faltou) — nunca uma sem a outra:

- **Auto check-in do aluno** (`student_checkin`): só funciona para a
  própria reserva, só quando `status = 'RESERVED'`, e só dentro da
  janela configurada — `checkin_open_minutes_before` antes do início da
  aula até `checkin_close_minutes_after` depois, calculado no fuso da
  organização (seção 16 do briefing). Fora da janela, mensagem clara em
  vez de deixar o aluno adivinhar por quê. No MVP essa janela é global
  por organização — não configurável por horário individual — ver seção
  16 do briefing ("implementar primeiro uma janela simples").
- **Marcação manual pela equipe** (`mark_attendance`, `OWNER`/`ADMIN`/
  `PROFESSOR`): marca presente ou faltou em qualquer reserva que não
  esteja cancelada, a partir da Agenda. Pode corrigir uma marcação
  anterior (ex.: aluno chegou atrasado e a equipe já tinha marcado
  falta) — não é um registro de mão única.
- Uma reserva cancelada (`CANCELLED`/`CANCELLED_LATE`) nunca pode
  receber presença — não existe "check-in de uma aula que o aluno já
  cancelou".
- O histórico de presença do aluno (aba "Presença" no detalhe do aluno)
  é derivado diretamente de `bookings.status`, não de uma tabela
  separada de histórico — a mesma fonte que a Fase 5 usa para contar
  sessões usadas no período.

## Financeiro e inadimplência (Fase 7)

- **Sem gateway de pagamento.** `payments` é controle manual — a equipe
  registra uma cobrança (valor, vencimento, assinatura) e depois marca
  como paga (forma de pagamento + data) quando o aluno pagar. Nenhuma
  cobrança é gerada automaticamente a partir da assinatura.
- **Inadimplência é sempre calculada, nunca marcada manualmente.** Um
  pagamento é considerado atrasado quando `due_date < hoje` e
  `status = 'PENDING'` — ponto. Não existe um botão "marcar como
  atrasado" nem um job que precise rodar para isso ficar correto; é
  verdade no instante em que é consultado (ver `docs/database.md`
  §"Esquema (Fase 7)").
- Só `OWNER`/`ADMIN` criam, editam ou cancelam pagamentos. `PROFESSOR`
  não vê a tela de Pagamentos — a spec é explícita que professores não
  gerenciam financeiro (seção 5), e por extensão também não precisam
  ver dados financeiros de alunos. Um `STUDENT` só vê os próprios
  pagamentos, sem nenhuma ação disponível (visualização apenas).
- **Bloqueio de reserva por inadimplência** (`organization_settings.block_booking_when_overdue`,
  padrão ligado): quando ativo, `create_booking()` recusa a reserva se o
  aluno tiver qualquer pagamento atrasado — mesma regra de "atrasado"
  acima, centralizada em `student_is_overdue()`, não reimplementada na
  Server Action. O aluno inadimplente continua conseguindo ver seu
  plano, pagamentos e histórico normalmente — só não consegue reservar
  aulas novas.
- O dashboard financeiro (cards de inadimplentes/valor em aberto/
  recebido) já existe em `/dashboard/payments`; a versão consolidada
  com todos os indicadores de negócio (seção 49 do briefing) chega na
  Fase 8.

## Dashboard administrativo (Fase 8)

`/dashboard` mostra a visão de negócio completa para `OWNER`/`ADMIN`
(seções 21 e 49 do briefing); `PROFESSOR`/`STUDENT` continuam vendo a
lista simples de equipe até a Fase 9 (Portal do Aluno) dar ao `STUDENT`
uma home própria. Definições exatas dos indicadores — para não
"inventar métricas" quando o dado não é auto-evidente (seção 49):

- **Alunos ativos/inativos**: `students.status`, direto.
- **Novos alunos**: alunos cujo `created_at` caiu nos últimos 30 dias.
  Essa é a única janela com uma definição não-ambígua no MVP — não
  existe um conceito de "mês de referência" ainda.
- **Alunos inadimplentes**: contagem de alunos **distintos** com pelo
  menos um pagamento `OVERDUE` — não a contagem de cobranças atrasadas
  (um aluno com duas cobranças atrasadas é 1 inadimplente, não 2). Vem
  de `getFinancialSummary()`, a mesma função que alimenta
  `/dashboard/payments`.
- **Receita recebida**: soma de pagamentos `PAID` cujo `paid_at` caiu no
  mês corrente (calendário, não "últimos 30 dias").
- **Receita pendente** / **Receita em atraso**: soma de `payments_with_status`
  com `effective_status = 'PENDING'` / `'OVERDUE'`, sem filtro de data —
  é "tudo que ainda vamos receber" e "tudo que já deveria ter sido
  recebido", respectivamente.
- **Aulas de hoje**: quantidade de `schedule_slots` ativos cujo
  `day_of_week` bate com o dia de hoje.
- **Vagas ocupadas hoje** / **Ocupação média hoje**: soma de reservas
  `RESERVED` de hoje sobre a soma de capacidades de hoje — a mesma
  contagem que alimenta a Agenda, não uma métrica paralela.
- A seção "Agenda de hoje" no dashboard é a mesma tela de
  `/dashboard/agenda`, resumida — clicar em "Ver" abre o mesmo diálogo
  de lista de alunos com marcação de presença.

## Portal do aluno (Fase 9)

A funcionalidade do portal (reservar, cancelar, check-in, ver
pagamentos) já existia desde as Fases 5–7; a Fase 9 entrega a
**experiência consolidada** que a seção 23 do briefing descreve:

- `/dashboard` para um `STUDENT` deixa de mostrar a lista de equipe
  (isso agora é exclusivo de `PROFESSOR`, até uma tela dedicada de
  professor existir) e mostra: saudação, plano atual com sessões
  usadas no período (mesmo cálculo de `create_booking()`, não uma
  segunda conta), próxima aula, e os botões de ação da seção 23.
- **Decisão deliberada**: "Reservar aula", "Minhas reservas" e "Fazer
  check-in" apontam para a mesma tela (`/dashboard/bookings`) em vez de
  três telas separadas — reservar e ver as próprias reservas são o
  mesmo fluxo na prática (o aluno normalmente faz as duas coisas na
  mesma visita), e o check-in só faz sentido no contexto de uma reserva
  existente. "Minhas reservas"/"Fazer check-in" usam uma âncora
  (`#minhas-reservas`) para pular direto pra lá. Três telas idênticas
  com nomes diferentes não pareciam genuinamente mais úteis — se isso
  se provar errado no uso real, separar depois é simples.
- **Decisão deliberada**: o portal do aluno usa o mesmo shell
  (`(dashboard)/layout.tsx`, sidebar) do painel administrativo, não um
  layout separado com navegação inferior — a sidebar do shadcn/ui já
  colapsa para um menu deslizante em telas pequenas, o que é um padrão
  mobile aceitável. "Pensado primeiro para mobile" (seção 36) foi
  priorizado no **conteúdo** (cards grandes, botões de toque generosos,
  layout de coluna única) em vez de reconstruir o chrome de navegação.
- "Meu perfil" (nome, e-mail somente leitura, telefone) fica em
  `/dashboard/profile` e é o mesmo formulário para qualquer papel, não
  uma tela exclusiva do aluno — todo usuário deveria poder editar o
  próprio nome/telefone.

## Painel de TV (Fase 10)

- **Rota real: `/studio/[slug]/display`, não `/studio/display`.** O
  briefing (seção 22) descreve a rota sem parâmetro, implicitamente
  assumindo um único Studio. Como o critério de sucesso do produto
  exige que um segundo Studio funcione sem alteração de código (seção
  54), a rota precisa saber *qual* organização exibir — o slug (já
  público, usado em URLs) resolve isso sem exigir login.
- **Pública, sem autenticação** — pensada para rodar sem supervisão
  numa TV/tablet na recepção do Studio. Isso só é seguro porque os
  dados expostos são deliberadamente mínimos: nome do Studio, ocupação
  por horário (números, sem nomes) e, ao selecionar uma aula, **apenas o
  primeiro nome** de cada aluno + um símbolo de presença (`✓`/`✗`/`–`).
  Nunca e-mail, telefone, ou qualquer outro dado. Ver
  `docs/database.md` §"RPCs públicas (Fase 10)".
- **Atualização automática por polling** (a cada 20s), não WebSockets —
  a agenda e, se uma aula estiver selecionada, a lista de alunos dessa
  aula são recarregadas juntas. Simples o bastante para o volume de uma
  academia; não há necessidade de tempo real sub-segundo aqui.
- A equipe (`OWNER`/`ADMIN`) encontra o link pelo botão "Abrir painel de
  TV" no Dashboard — não precisa digitar a URL de cor.

## Testes e um bug de fuso horário corrigido (Fase 11)

`tests/` cobre as 11 regras críticas da seção 44 do briefing como
testes de integração contra um Supabase real — ver `tests/README.md`.
**Escritos, mas não executados neste ambiente de desenvolvimento** (sem
Docker para Supabase local, sem credenciais de um projeto hospedado) —
ver a nota na tabela de progresso do README.

Escrever o teste de cancelamento (dentro/fora da janela) expôs um bug
real: `create_booking()` recusava "não é possível reservar uma data no
passado" comparando a data pedida contra `current_date` do Postgres —
que lê em **UTC** no Supabase, não no fuso da organização. Para o MF
Studio (America/Sao_Paulo, UTC-3), isso fazia a checagem usar a data de
"amanhã" (UTC) durante as primeiras ~3 horas de cada dia UTC (21h–00h
horário de Brasília) — nessa janela, um aluno tentando reservar um
horário mais tarde **no mesmo dia local** seria recusado incorretamente.
Corrigido em `20260808200001_fix_create_booking_timezone.sql`, comparando
contra `(now() at time zone organizations.timezone)::date` — a mesma
lição da seção 40 do briefing ("evitar timezone hardcoded espalhado pela
aplicação"), desta vez encontrada dentro do próprio banco.

## O que ainda NÃO existe (não confundir com "planejado para nunca existir")

CRUD dedicado de professores fica de fora do MVP — ver README para o
que ainda está planejado (Fase 11: testes e documentação final).
Nenhuma tela atual finge que essa ou outra funcionalidade existe.
