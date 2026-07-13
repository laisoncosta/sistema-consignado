# Regras de Negócio — Sistema Consignado

Este documento descreve as **regras de negócio e validações** implementadas no sistema. Ele complementa a [Visão Geral](01-Visao_Geral.md) e serve de referência para testes, cadastros e evolução do produto.

---

## 1. Perfis de usuário e acesso (RBAC)

O sistema possui cinco perfis operacionais:

| Perfil | Acesso principal |
|---|---|
| **Promotor** | Portal de Pedidos, visitas em loja, lançamento de pedidos |
| **Expedição** | Painel de expedição, aprovação/corte de itens, transferências avulsas |
| **Supervisor** | Dashboard da região (acompanhamento operacional) |
| **Administrador** | Dashboard, cadastros, usuários, relatórios da sua região |
| **Diretor** | Mesmo acesso do Administrador, com visão **global** (todas as regiões) |

### Redirecionamento após login

| Perfil | Tela inicial |
|---|---|
| Promotor | `/dashboard/portal-pedidos` |
| Expedição | `/dashboard/expedicao` |
| Supervisor | `/dashboard/supervisor` |
| Administrador / Diretor | `/dashboard/inicio` |

### Regras de rota

- Cada perfil só acessa as rotas permitidas pelo middleware (RBAC).
- **Administrador** e **Diretor** acessam cadastros (`/dashboard/admin/*`), gestão de expedição, relatório de visitas e fechamento.
- **Diretor** é o único perfil com **acesso global de região** (pode filtrar Manaus, Rio Branco ou todas).
- **Administrador** e demais perfis operam no escopo da **própria região**.
- **Promotor** só vê lojas **vinculadas** ao seu cadastro.
- Administrador e Diretor podem acessar o Portal de Pedidos (modo gestão/teste).

---

## 2. Regiões e escopo de dados

O sistema opera em duas regiões:

| Região | Marca |
|---|---|
| Manaus | Viva Ecológicos |
| Rio Branco | Buriti |

### Regras

- Produtos, lojas e pedidos pertencem a **uma região**.
- Usuários (exceto Diretor) só consultam e operam dados da **sua região**.
- A região define identidade visual (logo, cor) e fuso de data usado nos lançamentos.
- Lojas e produtos inativos não entram em operações do dia a dia.

---

## 3. Cadastro público e aprovação de conta

### Cadastro self-service

Qualquer pessoa pode se cadastrar pela tela pública informando:

- Nome completo (mínimo 3 caracteres)
- E-mail válido e único
- Senha (mínimo 6 caracteres) com confirmação
- Região de atuação

### Status após cadastro

| Campo | Valor inicial |
|---|---|
| Função | `Pendente` |
| Status da conta | `Pendente` |
| Ativo | `false` |

Usuário **Pendente não consegue fazer login** até ser aprovado.

### Aprovação

- **Administrador** ou **Diretor** altera o status para **Ativo**, define o **perfil** (Promotor, Expedição, etc.) e vincula as **lojas da rota** (quando promotor).
- Sem aprovação e vínculos, o promotor não opera no campo.

---

## 4. Autenticação, senha e sessão

### Login

- Autenticação por e-mail e senha, com sessão em cookie.
- Conta **Pendente** ou **Inativa** é bloqueada no login.

### Troca de senha obrigatória

- Quando `alterarSenhaObrigatorio = true` no cadastro do usuário, o sistema redireciona para `/alterar-senha` antes de qualquer tela do dashboard.
- A senha inicial padrão de novos usuários é `123456`; ela **não pode** ser reutilizada na troca obrigatória.
- Administrador pode resetar senha de um usuário — isso reativa a obrigatoriedade de troca no próximo login.

### Recuperação de senha

- Fluxo por e-mail com link temporário (mensagem genérica por segurança, mesmo se o e-mail não existir).

---

## 5. Trava de aparelho (device ID)

Regra gradual aplicada no login de promotores:

| Situação | Comportamento |
|---|---|
| Usuário sem aparelho vinculado | Primeiro login **vincula** o aparelho automaticamente |
| Aparelho diferente do cadastrado | Login **bloqueado** |
| `ignorarTravaAparelho = true` | Trava desativada para aquele usuário |

Mensagem de bloqueio: *"Aparelho não autorizado para este usuário. Entre em contato com a Diretoria."*

Administrador pode **resetar o aparelho** vinculado para liberar novo dispositivo.

---

## 6. Pedidos do promotor

### Natureza do pedido

- Pedido é **estritamente quantitativo** — campos: **Estoque**, **Avaria**, **Trocas** e **Pedido**.
- **Não há** valores em reais, preço unitário ou total acumulado na tela do promotor.

### Validações no envio

| Regra | Detalhe |
|---|---|
| Estoque obrigatório | Todos os produtos da loja devem ter estoque informado |
| Sem valores negativos | Nenhum campo numérico pode ser negativo |
| Loja vinculada | Promotor só envia para lojas da sua rota |
| Produtos ativos | Apenas produtos ativos na loja e na região entram no formulário |
| Irreversível | Após confirmar e enviar, o lançamento **não pode ser editado** pelo promotor |

### Tipos de lançamento por loja/dia

| Tipo | Descrição | Limite |
|---|---|---|
| **Principal** | Primeiro pedido do dia na loja — registra estoque, avaria, trocas e pedido | **1 por loja por dia** |
| **Extra (complementar)** | Quantidades adicionais de pedido, mantendo estoque/avaria/trocas do principal | **1 por loja por dia**, somente após o principal |

Regras de bloqueio:

- Não é possível enviar **dois pedidos principais** na mesma loja no mesmo dia.
- Pedido extra exige pedido principal já enviado no dia.
- Após principal + extra, não há novo lançamento — mensagem orienta contato com o Supervisor.

### Status após envio

- Pedido criado com status **Aguardando Aprovação** (`AGUARDANDO_APROVACAO`).
- Itens com pedido ou troca solicitados ficam **Pendente** na expedição; itens zerados podem ser auto-aprovados.

---

## 7. Cerca virtual (GPS)

A validação de GPS no envio do pedido ocorre quando o **promotor** tem cerca virtual **ativada** no cadastro.

Para liberar o pedido, a loja precisa estar completa:

1. Loja com cerca virtual **ativada**
2. Loja com **perímetro** (metros) maior que zero
3. Loja com **coordenadas** (latitude/longitude) configuradas

Se o promotor tem cerca ativa e a loja estiver incompleta, o pedido permanece **bloqueado** (não há contingência automática).

### Comportamento

| Condição | Resultado |
|---|---|
| Promotor sem cerca ativa | Pedido segue **sem** validação de GPS |
| Loja incompleta (promotor com cerca) | Envio bloqueado — contatar administrador |
| GPS indisponível | Envio bloqueado com orientação para ativar localização |
| Localização aproximada (precisão > 100 m) | Bloqueado — solicitar localização **Exata** no navegador/aparelho |
| Fora do perímetro | Envio bloqueado com distância exibida |
| Dentro do perímetro | Pedido permitido; distância registrada no pedido |
| Admin/Diretor no modo gestão | Sem bloqueio de cerca |

### Configuração da loja

- CEP preenche rua, bairro, cidade e UF.
- Número do endereço dispara geocodificação para obter latitude/longitude.
- Perímetro da cerca é informado em metros no cadastro da loja.

### Modo teste (desenvolvimento)

- Flag `CHECKIN_GPS_OBRIGATORIO` em `lib/pedido.ts`: quando `false`, promotores CLT lançam pedidos **sem** check-in GPS obrigatório (modo teste). Em produção/operação normal deve permanecer **`true`**.
- Em desenvolvimento com túnel HTTPS, a cerca virtual pode ser ignorada no servidor.

### Exibição no histórico do promotor (quantidades atendidas)

| Status do item | Pedido Atendido / Trocas Atendidas |
|---|---|
| Pendente | Em branco |
| Aprovado | Valor real |
| Reprovado | `0` |

O mesmo critério vale para **Pedido Extra Atendido**, conforme o status do extra na expedição.

---

## 8. Visita e check-in GPS

Fluxo do promotor na loja:

| Estado | Comportamento |
|---|---|
| **Disponível** | Botão de check-in; seleção de loja habilitada |
| **Em andamento** | Check-in registrado com data/hora e coordenadas; cronômetro ativo; troca de loja **bloqueada** |
| **Concluído** | Check-out registrado; tempo total da visita calculado |

### Registro dos horários

| Marco | Quando é gravado | Onde fica salvo |
|---|---|---|
| **Check-in** | Ao iniciar a visita na loja (GPS) | Enviado com o pedido no campo `inicioVisitaEm` |
| **Envio do pedido** | Ao confirmar e enviar o lançamento | `createdAt` do pedido |
| **Check-out** | No momento do envio do pedido | Mesmo horário do envio (`createdAt`) |

- O check-in captura geolocalização real do aparelho.
- Se o promotor **não fez check-in**, o pedido pode ser enviado sem `inicioVisitaEm` — nesse caso a auditoria mostra apenas o envio.
- Histórico de pedidos **não exige** validação de GPS/cerca virtual.

---

## 9. Relatório de Visita — Linha do Tempo (Raio-X)

No **Relatório de Visita**, ao abrir o detalhe de um pedido (Raio-X), a gestão vê:

### Card Cerca Virtual (resumo)

- Status da cerca (conforme / não conforme)
- Distância do promotor à loja no envio
- Check-in, check-out e tempo em loja

### Linha do Tempo (histórico cronológico)

Eventos exibidos **em ordem**, do mais antigo ao mais recente:

| Ordem | Evento | Quando aparece |
|---|---|---|
| 1 | **Check-in na loja** | Quando o pedido tem horário de entrada registrado |
| 2 | **Pedido criado/enviado** | Sempre |
| 3 | **Check-out (envio do pedido)** | Quando houve check-in (saída = momento do envio) |
| 4+ | **Eventos posteriores** | Aprovações/reprovações na expedição, cancelamento, restauração |

### Regras de exibição

- A linha do tempo usa os **mesmos dados** do card Cerca Virtual — não há horários diferentes entre os dois blocos.
- **Check-out** não é um botão separado hoje: coincide com o envio do pedido.
- Sem check-in registrado, a linha do tempo mostra apenas o envio do pedido e os eventos posteriores (expedição, etc.).
- Ações intermediárias no app (navegar abas, preencher campos) **não** aparecem na linha do tempo nesta versão.

---

## 10. Expedição

### Quem opera

- Perfil **Expedição**, **Administrador** e **Diretor**.

### Alteração por data

- **Expedição** só altera pedidos do **dia atual** (fuso da região).
- **Administrador** e **Diretor** podem alterar independentemente da data.

### Status dos itens

| Status | Significado |
|---|---|
| **Pendente** | Aguardando análise da expedição |
| **Aprovado** | Quantidades conferidas e liberadas |
| **Reprovado** | Item recusado |

### Regras de consolidação do pedido

- Enquanto **qualquer item** estiver pendente, o pedido pai permanece **Aguardando Aprovação**.
- Pedido só fica **Aprovado** quando **todos** os itens forem aprovados.
- Se todos forem reprovados, pedido fica **Reprovado**.

### Campos operacionais

- Expedição pode registrar **corte de pedido**, **corte de troca**, **bonificação** e **origem de saída**.
- Origem de saída é **obrigatória** quando há pedido aprovado ou troca atendida.
- Cálculos derivados: pedido aprovado = solicitado − corte; troca atendida = solicitada − corte de troca.

### Transferências avulsas

- Lançamentos avulsos (fora do fluxo normal do promotor) aparecem no painel de expedição.
- No modal de transferência avulsa, o campo de quantidade é exibido como **Qtde Avulsa** (rótulo visual; o dado continua sendo a quantidade da transferência).
- Origem com transferências vinculadas **não pode ser excluída**.

### Romaneio de Conferência (PDF) e colunas derivadas

Fórmulas de exibição por produto (tabela da expedição e PDF):

| Campo | Fórmula |
|---|---|
| **Qtde Avulsa** | Quantidade da transferência avulsa (zero em linhas de pedido do portal) |
| **Pedido CISS** | Pedido Aprovado + Qtde Avulsa |
| **Pedido Total** | Pedido Aprovado + Troca Atendida + Qtde Avulsa + Bonificação |

Regras:

- **Troca Atendida** e **Bonificação** não entram no Pedido CISS (valor lançado no sistema CISS da empresa).
- **Pedido Total** representa a quantidade física total que a loja recebe para conferência.
- No PDF, transferências avulsas são incorporadas nas colunas da tabela principal por produto/loja (não há mais seção separada no final).
- Exemplo: Pedido Aprovado 20 + Troca Atendida 1 + Qtde Avulsa 25 + Bonificação 25 → Pedido CISS **45**, Pedido Total **71**.

---

## 11. Cadastros administrativos

### Produtos

- Campos obrigatórios: código, nome e região.
- Produto pertence a uma região; pode ser vinculado a lojas específicas.

### Lojas

- Campos obrigatórios: código CISS, nome e região.
- Cadastro inclui endereço, geolocalização, parâmetros de cerca virtual e produtos ativos na loja.
- Promotores são vinculados a lojas pelo cadastro de usuário.

### Usuários

- Perfis disponíveis: Promotor, Expedição, Supervisor, ADM, Diretor.
- Status: **Ativo**, **Pendente** ou **Inativo**.
- Promotor pode ter flag **CLT** e **cerca virtual** individual.
- Administrador pode liberar trava de aparelho por usuário.

### Origens de saída

- Nome e região obrigatórios.
- Usadas na expedição para indicar de onde saiu o produto.

---

## 12. Regras transversais

| Tema | Regra |
|---|---|
| **Data operacional** | Lançamentos e limites diários usam data do Brasil (fuso da região) |
| **Exclusão de pedido** | Pedidos podem ser excluídos pela gestão (com motivo e auditoria) |
| **Número amigável** | Cada pedido recebe número sequencial legível para rastreio |
| **Auditoria** | Ações críticas (expedição, visitas, exclusões) geram logs |
| **Importação Excel** | Cadastros de lojas, produtos e usuários suportam importação em lote |

---

## 13. O que pode mudar nos testes

Estas regras refletem o comportamento **atual do código**. Durante a fase de testes, flags e validações podem ser ajustadas (ex.: obrigatoriedade de GPS, limites de pedido extra). Qualquer mudança deve ser refletida neste documento.

---

## Próximo documento

→ [03-Telas.md](03-Telas.md) — rotas, telas e fluxos de interface
