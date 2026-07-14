# Telas — Sistema Consignado

Este documento descreve **todas as telas e fluxos de interface** do sistema — rotas, perfis que acessam, layout, campos, ações e modais. Complementa a [Visão Geral](01-Visao_Geral.md) e as [Regras de Negócio](02-Regras-Negocios.md).

> **Escopo:** o arquivo `03-Telas.md` concentra **todas as telas** em um único documento. A pasta `Documentacao/` é organizada por **tema** (visão geral, regras, telas, banco, prompt) — não há um arquivo separado por tela.

---

## Índice de rotas

| Rota | Tela | Perfil(is) | Status |
|---|---|---|---|
| `/` | Redirecionamento | Público | Ativo |
| `/login` | Login / Cadastro / Recuperar senha | Público | Ativo |
| `/alterar-senha` | Troca obrigatória de senha | Autenticado | Ativo |
| `/redefinir-senha` | Nova senha via link de e-mail | Público (com token) | Ativo |
| `/dashboard/portal-pedidos` | Portal de Pedidos | Promotor, Admin, Diretor | Ativo |
| `/dashboard/promotor` | Redirecionamento legado | — | Redireciona |
| `/dashboard/expedicao` | Expedição (perfil operacional) | Expedição | Ativo |
| `/dashboard/gestao/expedicao` | Expedição (menu gestão) | Expedição, Admin, Diretor | Ativo |
| `/dashboard/supervisor` | Área do Supervisor | Supervisor | Placeholder |
| `/dashboard/inicio` | Dashboard Executivo | Admin, Diretor | Ativo |
| `/dashboard/gestao/relatorio-visitas` | Relatório de Visita | Admin, Diretor | Ativo |
| `/dashboard/fechamento` | Fechamento de Resultados | Admin, Diretor | Placeholder |
| `/dashboard/admin/produtos` | Gestão de Produtos | Admin, Diretor | Ativo |
| `/dashboard/admin/origens` | Cadastro de Origens | Admin, Diretor | Ativo |
| `/dashboard/admin/lojas` | Gestão de Lojas | Admin, Diretor | Ativo |
| `/dashboard/admin/usuarios` | Gestão de Usuários | Admin, Diretor | Ativo |
| `/dashboard/admin` | Redirecionamento legado | — | Redireciona |
| `/dashboard/diretor` | Redirecionamento legado | — | Redireciona |

---

## 1. Layouts do dashboard

O sistema usa **dois layouts** conforme o perfil logado:

### Layout Gestão (Administrador e Diretor)

| Elemento | Descrição |
|---|---|
| **Sidebar esquerda** | Menu de operação + submenu Administração; pode ser recolhida |
| **Header superior** | Título da área, região, logos (duplos quando Diretor), usuário, tema e logout |
| **Área de conteúdo** | Painel da rota ativa |
| **Foco** | Desktop — telas com tabelas, gráficos e cadastros amplos |

Itens do menu lateral:

**Operação**
- Dashboard → `/dashboard/inicio`
- Portal de Pedidos → `/dashboard/portal-pedidos`
- Expedição → `/dashboard/gestao/expedicao`
- Relatório de Visita → `/dashboard/gestao/relatorio-visitas`
- Fechamento de Resultados → `/dashboard/fechamento`

**Administração** (submenu expansível)
- Cadastro de Produtos → `/dashboard/admin/produtos`
- Cadastro de Origens → `/dashboard/admin/origens`
- Cadastro de Lojas → `/dashboard/admin/lojas`
- Gestão de Usuários e Perfis → `/dashboard/admin/usuarios`

Rodapé da sidebar: botão de **tema claro/escuro** e **Sair**.

### Layout Operacional (Promotor, Expedição, Supervisor)

| Elemento | Descrição |
|---|---|
| **Sidebar** | Não exibida |
| **Header superior** | Título, região, usuário, tema e logout |
| **Navegação extra** | Abas no topo (ex.: Portal do promotor) quando aplicável |
| **Área de conteúdo** | Painel da rota |

---

## 2. Telas públicas

### 2.1 Raiz — `/`

Redireciona automaticamente para `/login`.

### 2.2 Login — `/login`

Tela única com múltiplas **views** internas (sem mudar a URL):

| View | O que o usuário vê e faz |
|---|---|
| **login** | E-mail, senha, "Permanecer conectado", botão Entrar, links para cadastro e recuperar senha |
| **cadastro** | Nome completo, e-mail, região, senha e confirmação — cria conta **Pendente** |
| **recuperar** | E-mail para envio do link de redefinição |
| **recuperar-enviado** | Confirmação de que o e-mail foi solicitado (mensagem genérica por segurança) |
| **pendente** | Mensagem após cadastro: aguardando aprovação do administrador |

**Detalhes da interface:**
- Fundo com identidade da marca (Viva ou Buriti)
- Logo da região no topo
- Tema sempre **claro** nesta tela
- A marca pode mudar conforme o e-mail digitado (dica visual Manaus/Rio Branco)
- Login envia identificador do aparelho (`deviceId`) para validação de trava

### 2.3 Alterar senha — `/alterar-senha`

| Quem acessa | Usuário autenticado com `alterarSenhaObrigatorio = true` |
|---|---|
| **Quando aparece** | Primeiro acesso, senha resetada pelo admin ou senha inicial padrão |
| **Campos** | Nova senha, confirmar senha |
| **Após salvar** | Redireciona para a tela inicial do perfil |

Usuário sem obrigatoriedade de troca é redirecionado para o dashboard.

### 2.4 Redefinir senha — `/redefinir-senha?token=...`

| Quem acessa | Qualquer pessoa com link válido recebido por e-mail |
|---|---|
| **Campos** | Nova senha, confirmar senha |
| **Token inválido/expirado** | Mensagem de erro; opção de voltar ao login |

---

## 3. Portal de Pedidos — `/dashboard/portal-pedidos`

| Perfil | Uso |
|---|---|
| **Promotor** | Tela inicial — operação diária em campo |
| **Administrador / Diretor** | Modo gestão — visualizar/testar em nome de promotor |

**Layout:** operacional, **otimizado para celular** (promotor).

**Rota legada:** `/dashboard/promotor` → redireciona para esta rota.

### 3.1 Navegação por abas

Barra fixa no topo (`PromotorNav`):

| Aba | URL | Ícone / rótulo |
|---|---|---|
| Portal de Pedidos | `/dashboard/portal-pedidos` | Pedidos |
| Histórico de Pedidos | `?aba=historico` | Histórico |

### 3.2 Aba Portal de Pedidos — promotor

#### Cabeçalho
- Saudação personalizada com nome do promotor (ex.: "Bom dia, João")

#### Bloco Novo Pedido Consignado
Componente principal: `NovoPedido`

| Etapa | O que aparece na tela |
|---|---|
| 1 | Dropdown **Selecione a Loja Atual** (lojas vinculadas ao cadastro) |
| 2 | Validação **GPS / cerca virtual** (quando ativa para promotor e loja). Check-in CLT **não é usado**. |
| 3 | Alertas: fora do perímetro, localização imprecisa (pedir GPS **Exata**) |
| 4 | Botão **"+ Novo Pedido"** (caixa tracejada verde) |
| 5 | Formulário quantitativo por produto |
| 6 | Modal de **Conferência** antes do envio |
| 7 | Tela de confirmação — status **Aguardando Aprovação** |
| 8 | Após principal enviado: botão **"+ Pedido Extra"** + texto auxiliar |

#### Formulário de produtos (sem valores em R$)

Por linha de produto:

| Coluna | Tipo |
|---|---|
| Código CISS | Automático |
| Nome do produto | Automático |
| Estoque | Digitado (obrigatório no principal) |
| Avaria | Digitado |
| Trocas | Digitado |
| Pedido | Digitado |

- Grade **2×2** no celular para os campos digitáveis
- Botão **Enviar** em largura total no mobile
- Pedido extra: estoque/avaria/trocas **travados**; só pedido é editável
- Conferência do pedido extra: lista **somente produto + quantidade digitada** (omite produtos com quantidade 0)

#### Parâmetros de URL

| Parâmetro | Efeito |
|---|---|
| `?aba=historico` | Abre aba Histórico |
| `?abrirFormulario=1` | Abre formulário automaticamente |
| `?pedidoExtra=1` | Inicia fluxo de pedido extra |

### 3.3 Aba Histórico de Pedidos — promotor

Componente: `HistoricoPedidos`

**Filtros:**
- Data inicial e final (não ultrapassa hoje)
- Status (todos, Aguardando, Aprovado, Aprovado Parcialmente, Reprovado…)
- Produto (desktop)
- Loja (quando aplicável)
- Modo "somente pendentes"

**Visão desktop:** tabela ampla agrupada por produto, loja, data e status.

**Visão mobile:** cards por pedido com filtros compactos; layout adaptado ao **tema dark** (cards, filtros, badges e seções de transferência avulsa).

**Pedido Extra no histórico mobile:** bloco próprio com status ao lado (**Aprovado** borda verde / **Reprovado** borda vermelha / **Pendente** borda âmbar), pois a expedição trata o extra separadamente.

**Pedido Atendido / Trocas Atendidas:** em branco enquanto **Pendente**; valor quando **Aprovado**; `0` quando **Reprovado** (igual para Pedido Extra Atendido).

**Campos no card mobile (transferência avulsa):** **Qtde Avulsa**, Bonificação e Motivo (quando houver).

**Dados:** carregados de `/api/pedidos/historico`.

### 3.4 Modo gestão (Administrador / Diretor)

Mesma rota, painel diferente (`PortalPedidosPainel` com `modoGestaoAdministrativa`):

| Elemento | Função |
|---|---|
| **Filtros admin** | Região → Promotor → Loja |
| **Novo Pedido** | Formulário do promotor/loja selecionados (sem bloqueio de cerca) |
| **Histórico** | Pedidos do promotor selecionado |
| **Sidebar** | Menu completo de gestão visível |

**Mobile (Admin/Diretor):** menu lateral vira **drawer** (ícone ☰ no cabeçalho), com submenu Administração, sair e tema. Portal em modo gestão usa os mesmos padrões de toque do promotor (`otimizadoMobile`). Telas amplas (cadastros, dashboard executivo) permanecem acessíveis com rolagem horizontal e aviso de melhor experiência no desktop.

---

## 4. Expedição

Duas rotas, **mesmo painel** (`ExpedicaoPainel`):

| Rota | Perfil | Sidebar |
|---|---|---|
| `/dashboard/expedicao` | Expedição (tela inicial) | Não |
| `/dashboard/gestao/expedicao` | Expedição, Admin, Diretor | Sim (Admin/Diretor) |

**Layout:** desktop (`desktopOnly`). A página inteira rola com o mouse — cabeçalho, alertas e filtros sobem junto com o conteúdo, para funcionar em monitores com resolução menor.

### Cabeçalho do painel
- Título da expedição (varia por região/perfil)
- Botão **Transferência Avulsa**

### Alertas regionais
Cards de pendências por região (quando há pedidos aguardando em datas anteriores).

### Filtros
- Data início / fim
- Região (Diretor: Manaus / Rio Branco / Todas)
- Promotor, loja, produto, origem
- Tipo de pedido (normal, extra, avulsa)
- Status (todos, pendente, aprovado, reprovado)

### Tabela de lançamentos
Colunas principais: produto, loja, estoque, avarias, pedido solicitado, corte, pedido aprovado, troca solicitada, troca atendida, **qtde avulsa**, **bonificação**, **pedido total**, data, tipo, status.

- **Qtde Avulsa:** quantidade de transferência avulsa na linha (zero em pedidos do portal).
- **Pedido Total:** Pedido Aprovado + Troca Atendida + Qtde Avulsa + Bonificação (conferência física na loja).

**Ações por linha:**
- Abrir modal de **Aprovação** (pedidos do portal)
- Editar **Transferência Avulsa**

### Barra de ações
- Atualizar filtros
- Exportar **PDF** (Romaneio de Conferência de Mercadoria — colunas: Cód Produto, Produto, Origem, Estoque, Pedido Solicitado, Corte Pedido, Troca Atendida, Qtde Avulsa, Bonificação, Pedido CISS, Pedido Total; assinaturas: Responsável Expedição e Motorista)
- Exportar **Excel**

### Modais da expedição

| Modal | Função |
|---|---|
| **AprovacaoPedidoModal** | Conferir item: cortes, aprovação, reprovação, origem, bonificação; **tipo de pedido destacado** (Principal/Extra) acima dos dados; renderizado em portal sobre o cabeçalho (`z-index` alto) |
| **TransferenciaAvulsaModal** | Lançamento avulso (campo **Qtde Avulsa**, bonificação, motivo); tipo **Pedido Avulso** destacado; mesmo portal sobre o cabeçalho |

---

## 5. Supervisor — `/dashboard/supervisor`

| Perfil | Supervisor (tela inicial) |
|---|---|
| **Layout** | Operacional, desktop |
| **Conteúdo atual** | Placeholder — "Área do Supervisor" em construção |

---

## 6. Dashboard Executivo — `/dashboard/inicio`

| Perfil | Administrador, Diretor (tela inicial) |
|---|---|
| **Layout** | Gestão, variant `executive`, desktop |

### Cabeçalho e filtros
- Período (data início / fim)
- Região (Manaus / Rio Branco / Todas)
- Comparar regiões (Diretor)
- Loja, produto, promotor, dia da semana
- Botão Atualizar

### Cards de KPI
Exemplos: pedidos solicitados, volume, avarias, trocas, taxa de atendimento, tempo em loja.

### Abas

| Aba | Conteúdo |
|---|---|
| **Geral** | Gráficos de barras: pedidos por loja, por produto, cortes, ranking promotores |
| **Tendências** | Evolução temporal de pedidos e indicadores |
| **Avarias** | Análise de avarias por produto/loja |

Gráficos adaptam cores ao tema claro/escuro.

---

## 7. Relatório de Visita — `/dashboard/gestao/relatorio-visitas`

| Perfil | Administrador, Diretor |
|---|---|
| **Layout** | Gestão, desktop |

### Cabeçalho
- Título por região (Diretor alterna Manaus / Rio Branco)
- Gradiente com cor da marca da região

### Filtros
- Data início / fim
- Região (Diretor)
- Promotor, loja
- Integridade da cerca: todos / conforme / não conforme
- Busca por número do pedido

### Cards de totais
Total de visitas, conformes e inconformes.

### Tabela de registros
Colunas: pedido, data/hora, promotor, loja, status, tempo em loja, farol de integridade.

**Ações:**
- Clicar no pedido → abre **Raio-X**
- Excluir pedido (com alerta conforme progresso da expedição: nenhum / parcial / crítico)

### Modal Raio-X (`PedidoRaioXModal`)

| Bloco | Conteúdo |
|---|---|
| **Cabeçalho** | Nº amigável, status, data/hora envio, promotor, loja |
| **Cerca Virtual** | Status conforme/não conforme, distância, check-in, check-out, tempo em loja |
| **Resumo do Pedido** | Total produtos, volume, tipo (Principal/Extra), progresso conferência |
| **Linha do Tempo** | Check-in → pedido enviado → check-out → eventos expedição/auditoria |
| **Mapa de Auditoria** | Mapa interativo (Leaflet/OpenStreetMap) com marcadores fixos: loja (verde) e GPS do envio (vermelho); linha tracejada entre os pontos, legenda, coordenadas e link externo |

---

## 8. Fechamento de Resultados — `/dashboard/fechamento`

| Perfil | Administrador, Diretor |
|---|---|
| **Status** | Placeholder |
| **Mensagem** | "Em breve: Fechamento Semanal (Manaus) e Quinzenal (Rio Branco)" |

---

## 9. Gestão de Produtos — `/dashboard/admin/produtos`

| Perfil | Administrador, Diretor |
|---|---|

### Listagem
- Cards clicáveis: listados, Manaus, Rio Branco, ativos, inativos
- Campo de busca
- Tabela: código CISS, descrição, preço unitário (cadastro interno), região, status
- Botão **Novo Produto**
- Barra importar/exportar **Excel**
- **Rolagem livre da página:** cabeçalho, indicadores e filtros sobem junto com a tabela; apenas a largura da tabela usa rolagem horizontal quando necessário.

### Painel lateral — `ProdutoFormPanel`

| Campo | Descrição |
|---|---|
| Código CISS | Identificador do produto |
| Descrição | Nome exibido no portal |
| Preço unitário | Uso interno/cadastro (não aparece no formulário do promotor) |
| Região | Manaus ou Rio Branco |
| Status | Ativo / Inativo |

---

## 10. Cadastro de Origens — `/dashboard/admin/origens`

| Perfil | Administrador, Diretor |
|---|---|

### Listagem
- Abas/filtro por região
- Busca por nome
- Tabela: nome, região, status
- Botões: **Nova Origem**, editar, excluir (bloqueado se houver transferências vinculadas)

### Painel lateral — `OrigemFormPanel`

| Campo | Descrição |
|---|---|
| Nome | Nome da origem de saída |
| Região | Manaus ou Rio Branco |
| Status | Ativo / Inativo |

---

## 11. Gestão de Lojas — `/dashboard/admin/lojas`

| Perfil | Administrador, Diretor |
|---|---|
| **Diretor** | Acesso global — filtro Manaus / Rio Branco / Todas; logos duplos no header |

### Listagem
- Cards: total, Manaus, Rio Branco, ativas (clicáveis como filtro)
- Busca por nome ou código
- Tabela: código CISS, nome, região, cidade, status
- Botão **Nova Loja**
- Importar/exportar **Excel**
- **Rolagem livre da página:** cabeçalho, indicadores e filtros sobem junto com a tabela; apenas a largura da tabela usa rolagem horizontal quando necessário.

### Painel lateral — Cadastrar (`LojaCadastroPanel`)

Desliza da direita. Seções:

| Seção | Campos |
|---|---|
| **Dados da Loja** | Código CISS, nome, região, status (ativa/inativa) |
| **Localização** | CEP (autocomplete), rua, nº, bairro, cidade, UF; geocodificação ao informar número |
| **Parâmetro Cerca Virtual** | Ativar/desativar, latitude, longitude, perímetro (metros) |
| **Produtos na loja** | Checklist de produtos da região — marcar ativos nesta loja |

### Painel lateral — Editar (`LojaEditPanel`)

Mesma estrutura do cadastro, com dados preenchidos e botão **Salvar e Sair**.

---

## 12. Gestão de Usuários — `/dashboard/admin/usuarios`

| Perfil | Administrador, Diretor |
|---|---|

### Listagem
- Cards: total ativos, Manaus, Rio Branco, pendentes
- Filtros: região, perfil, status, busca
- Tabela: nome, e-mail, perfil, região, status, CLT, cerca, lojas
- Botão **Novo Usuário**
- Importar/exportar **Excel**
- **Rolagem livre da página:** cabeçalho, indicadores e filtros sobem junto com a tabela; apenas a largura da tabela usa rolagem horizontal quando necessário.

### Ações rápidas na linha
- Editar
- Resetar senha (volta para senha inicial + troca obrigatória)
- Resetar aparelho vinculado
- Indicadores: aparelho cadastrado, trava ignorada

### Painel lateral (drawer) — cadastro/edição

| Campo | Descrição |
|---|---|
| Nome | Nome completo |
| E-mail | Login do sistema |
| Telefone | Opcional |
| Código CISS | Opcional |
| CLT | SIM / NÃO |
| Perfil | Promotor, Expedição, Supervisor, ADM, Diretor |
| Região | Filial de atuação; Diretor pode ter acesso a todas |
| Status | Ativo, Pendente, Inativo |
| Ignorar trava de aparelho | Libera login em qualquer dispositivo |
| Cerca virtual | Ativar / Inativar (promotores) |
| Lojas vinculadas | Multi-seleção — rota do promotor (somente perfil Promotor); campo de **busca por nome** filtra a lista em tempo real |

---

## 13. Modais e painéis flutuantes (resumo)

Telas que abrem **sobre** a tela principal, sem rota própria:

| Componente | Abre em | Função |
|---|---|---|
| `ConferenciaLancamentosModal` | Portal de Pedidos | Revisão final antes de enviar o pedido |
| `PedidoDuplicadoModal` | Portal de Pedidos | Aviso quando já existe lançamento no dia |
| `AprovacaoPedidoModal` | Expedição | Conferência e aprovação de item |
| `TransferenciaAvulsaModal` | Expedição | Lançamento avulso |
| `PedidoRaioXModal` | Relatório de Visita | Auditoria completa do pedido (inclui `MapaAuditoriaLeaflet`) |
| `LojaCadastroPanel` / `LojaEditPanel` | Gestão de Lojas | Cadastro/edição lateral |
| `ProdutoFormPanel` | Gestão de Produtos | Cadastro/edição lateral |
| `OrigemFormPanel` | Cadastro de Origens | Cadastro/edição lateral |
| Drawer de usuário | Gestão de Usuários | Cadastro/edição lateral |

---

## 14. Redirecionamentos e proteção de rotas

O **middleware** protege `/dashboard/*` e `/alterar-senha`:

| Situação | Comportamento |
|---|---|
| Sem sessão | Redireciona para `/login` |
| Senha obrigatória pendente | Redireciona para `/alterar-senha` |
| Rota não permitida ao perfil | Redireciona para tela inicial do perfil |

**Telas iniciais por perfil:**

| Perfil | Rota após login |
|---|---|
| Promotor | `/dashboard/portal-pedidos` |
| Expedição | `/dashboard/expedicao` |
| Supervisor | `/dashboard/supervisor` |
| Administrador / Diretor | `/dashboard/inicio` |

---

## 15. Mobile vs desktop

| Área | Dispositivo principal |
|---|---|
| Portal de Pedidos (promotor) | **Celular** |
| Portal de Pedidos (admin/diretor) | **Celular e desktop** (modo gestão otimizado no celular) |
| Histórico (promotor) | Celular e desktop (layouts diferentes) |
| Login / Cadastro | Responsivo |
| Expedição | **Desktop** (acessível no celular para apoio em campo) |
| Dashboard Executivo | **Desktop** (acessível no celular com aviso) |
| Relatório de Visita | **Desktop** (acessível no celular com aviso) |
| Cadastros (produtos, lojas, usuários, origens) | **Desktop** (acessível no celular com aviso) |
| Fechamento | **Desktop** (quando ativo; acessível no celular com aviso) |

**Admin/Diretor no celular:** drawer de navegação (☰) espelha o sidebar desktop — Operação + submenu Administração. Logout e tema no cabeçalho.

Telas `desktopOnly` exibem aviso em telas pequenas, mas o conteúdo permanece acessível (rolagem horizontal quando necessário). Layout desktop (`lg+`) inalterado.

---

## 16. Mapa visual por perfil

```
PROMOTOR
  └── Portal de Pedidos (/dashboard/portal-pedidos)
        ├── Aba Pedidos (seleciona loja → cerca virtual → formulário → conferência → envio)
        └── Aba Histórico (?aba=historico)

EXPEDIÇÃO
  └── Painel Expedição (/dashboard/expedicao)

SUPERVISOR
  └── Dashboard Supervisor (/dashboard/supervisor) [placeholder]

ADMINISTRADOR / DIRETOR
  ├── Dashboard Executivo (/dashboard/inicio)
  ├── Portal de Pedidos — modo gestão
  ├── Expedição (/dashboard/gestao/expedicao)
  ├── Relatório de Visita (/dashboard/gestao/relatorio-visitas)
  ├── Fechamento [placeholder]
  └── Administração
        ├── Produtos
        ├── Origens
        ├── Lojas
        └── Usuários
```

---

## Próximo documento

→ [04-Banco-Dados.md](04-Banco-Dados.md) — tabelas, relacionamentos e migrations
