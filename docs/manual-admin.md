# Manual do Administrador — MF Studio

Este manual explica como usar o sistema do MF Studio no dia a dia: cadastrar
alunos, montar planos e horários, controlar presença e cobranças, e
acompanhar os números do negócio.

## Seus dados de acesso

| | |
| --- | --- |
| **Endereço** | https://mfstudio-livid.vercel.app/ |
| **E-mail** | admin@mfstudio.com |
| **Senha** | DQAqjoVCeggBSrJw |

Guarde essa senha em um lugar seguro. Recomendamos usá-la apenas para o
primeiro acesso e depois seguir com o login normal (e-mail + senha) nas
próximas vezes.

## 1. Primeiro acesso

1. Acesse o endereço acima e entre com o e-mail e a senha informados.
2. Como é o primeiro acesso, a tela vai pedir para você **criar o seu
   Studio**: informe o nome (ex.: "MF Studio") e um identificador (gerado
   automaticamente a partir do nome — pode deixar como está).
3. Ao confirmar, você se torna o **proprietário (OWNER)** do Studio e já
   entra direto no Dashboard.

A partir daqui, o menu do lado esquerdo dá acesso a todas as áreas abaixo.

## 2. Configurações

Antes de cadastrar alunos, vale configurar o Studio. Em **Configurações**
há quatro abas:

### Studio
Nome, telefone, e-mail e endereço do Studio, além do **fuso horário** —
usado para calcular horários de aula, janelas de cancelamento e
vencimentos. Ajuste e clique em **Salvar alterações**.

### Agenda e financeiro
- **Capacidade padrão por horário**: valor sugerido ao criar um novo
  horário (cada horário pode ter uma capacidade diferente, se precisar).
- **Janela de cancelamento (minutos)**: cancelamentos feitos com menos
  antecedência que isso contam como sessão utilizada mesmo assim.
- **Check-in abre / fecha**: quantos minutos antes e depois do início da
  aula o aluno consegue fazer check-in pelo celular.
- **Bloquear reservas de alunos inadimplentes**: se ativado, aluno com
  pagamento em atraso não consegue reservar novas aulas.

### Categorias
Categorias agrupam os horários (por exemplo "Manhã" e "Noite", ou
"Premium" e "Alternativo" — o nome é livre). Os planos definem a quais
categorias cada aluno tem acesso. Clique em **Nova categoria** para
criar, ou use os ícones de lápis/lixeira para editar/remover. Uma
categoria em uso por algum horário não pode ser removida — desative-a
(interruptor "Ativa") em vez disso.

### Horários
Cada horário é um dia da semana + início + fim + capacidade, dentro de
uma categoria. Clique em **Novo horário** e preencha dia, início, fim,
categoria e capacidade. Os horários se repetem todas as semanas no dia
escolhido. É preciso ter pelo menos uma categoria criada antes.

## 3. Planos

Em **Planos**, defina o que os alunos podem assinar: nome, preço, ciclo
de cobrança (mensal etc.), quantas sessões por semana ou por mês, e a
quais **categorias de horário** o plano dá acesso. Clique em **Novo
plano** para criar um, ou edite/remova um existente na tabela. É preciso
ter pelo menos uma categoria de horário criada antes de criar planos.

> O preço fica "congelado" na assinatura de cada aluno — alterar o preço
> de um plano não muda o valor de quem já assina.

## 4. Alunos

Em **Alunos** você vê a lista completa, com busca por nome/e-mail e
filtro por status (ativos/inativos).

### Cadastrar um aluno novo
Clique em **Novo aluno** e preencha nome, e-mail, **uma senha** (mínimo
8 caracteres), telefone (opcional), plano e data de início. É preciso
ter pelo menos um plano criado antes.

> **Nenhum e-mail é enviado automaticamente.** Depois de cadastrar,
> anote o e-mail e a senha que você definiu e envie para o aluno (por
> WhatsApp, por exemplo) — é assim que ele vai acessar o portal dele
> pela primeira vez.

### Página do aluno
Clicando em um aluno da lista, você tem abas para:
- **Informações**: dados pessoais.
- **Plano**: plano ativo e histórico. Use "Trocar plano"/"Vincular
  plano" para mudar.
- **Próximas reservas**: reservas futuras do aluno; "Nova reserva" deixa
  você reservar uma aula em nome dele.
- **Presença**: histórico de aulas com presença/falta.
- **Pagamentos**: histórico financeiro do aluno; "Novo pagamento" cria
  uma cobrança (veja a seção 6).
- **Observações**: anotações internas, visíveis só para a equipe.

No topo da página, o interruptor ao lado do nome ativa/inativa o aluno —
um aluno inativo não consegue reservar aulas.

## 5. Agenda

Em **Agenda**, você vê os horários do dia selecionado (use "Anterior",
"Hoje" e "Próximo" para navegar) com a ocupação de cada um (reservas /
capacidade).

Clique em **Ver alunos** em qualquer horário para abrir a lista de quem
reservou. Lá você pode:
- Marcar **Presente** ou **Faltou** para cada aluno reservado.
- **Cancelar** a reserva de um aluno, se necessário.
- **Corrigir** uma presença/falta já marcada, se precisar ajustar.

## 6. Pagamentos

Em **Pagamentos**, você acompanha o financeiro: quantos alunos estão
inadimplentes, valor em atraso, valor a receber e valor recebido no mês
— com filtro por status (pendentes, atrasados, pagos, cancelados).

Esse controle é **manual** — não há cobrança automática nem integração
com meio de pagamento. Para registrar uma cobrança nova ou marcar uma
como paga, use a aba **Pagamentos** dentro da página de cada aluno
("Novo pagamento" / "Registrar pagamento", informando forma e data).

## 7. Dashboard

A tela inicial reúne os principais indicadores do Studio: alunos ativos,
novos alunos (30 dias), inativos, inadimplentes, receita recebida no
mês, receita pendente, receita em atraso e ocupação média do dia — além
da agenda do dia logo abaixo.

## 8. Painel de TV

Em `/studio/mf-studio/display` (sem necessidade de login — ótimo para
deixar aberto em uma TV na recepção) fica um painel com a agenda do dia
e ocupação das aulas. Há também um botão "Abrir painel de TV" direto no
Dashboard.

## 9. O que a equipe e os alunos veem

- **Professor**: vê a Agenda (marcar presença/falta, cancelar reservas)
  e o próprio perfil — não vê Alunos, Planos, Pagamentos nem
  Configurações.
- **Aluno**: ao entrar, vê uma home com o plano atual, sessões
  utilizadas e a próxima aula. No menu dele aparecem "Reservar aula"
  (escolher e reservar horários, ver/cancelar suas próprias reservas,
  fazer check-in no dia) e "Pagamentos" (só os pagamentos dele).

## 10. Seu perfil

Em **Meu perfil**, qualquer usuário edita seus próprios dados (nome,
telefone). O menu do usuário, no topo da tela, tem a opção de sair da
conta.
