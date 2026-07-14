# Prompt Mestre — Sistema Consignado

Texto consolidado para orientar IAs (Cursor, ChatGPT, Claude, etc.) ao trabalhar neste projeto. Resume os documentos `01` a `04` em um único contexto.

---

## Como usar

### Opção A — Cursor (recomendado)

1. Abra o projeto `Sistema-Consignado` no Cursor.
2. Em um chat novo, cole o bloco **"Prompt para colar"** abaixo.
3. Se a tarefa for específica, adicione no final: *"Tarefa: [descreva o que precisa]"*.
4. Para mudanças grandes, peça para a IA ler também o arquivo relevante em `Documentacao/`.

### Opção B — Outra IA

1. Cole o prompt abaixo.
2. Anexe ou cole trechos de `Documentacao/02-Regras-Negocios.md`, `03-Telas.md` ou `04-Banco-Dados.md` quando a tarefa exigir detalhe.

### Opção C — Regra permanente no Cursor

Crie uma regra em `.cursor/rules/` apontando para este arquivo, para o contexto carregar automaticamente.

---

## Prompt para colar

```
Você está trabalhando no **Sistema Integrado de Pedidos Consignados** — aplicação web para gestão de pedidos consignados em campo (promotores em lojas → expedição → gestão).

## Stack
- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma 7 (schema: prisma/schema.prisma; client em app/generated/prisma)
- Banco de dados atual: Neon (Postgres). Decisão de banco definitivo (Neon vs. outro provedor) ainda em aberto — não migrar, sugerir migração ou assumir outro banco sem instrução explícita do usuário.
- Tailwind CSS 4
- Autenticação por sessão (cookie + middleware)
- Deploy: Vercel (branch main → deploy automático)
- Repositório: https://github.com/laisoncosta/sistema-consignado

## Regiões e marcas
| Região | Marca | Cor |
| Manaus | Viva Ecológicos | Verde |
| Rio Branco | Buriti | Vermelho |

Dados (produtos, lojas, pedidos) pertencem a uma região. Diretor vê todas; demais perfis só a própria região.

## Perfis (RBAC)
| Perfil | Tela inicial | Acesso principal |
| Promotor | /dashboard/portal-pedidos | Portal de pedidos, cerca virtual GPS, histórico |
| Expedição | /dashboard/expedicao | Aprovação/corte, transferências avulsas |
| Supervisor | /dashboard/supervisor | Placeholder |
| Administrador | /dashboard/inicio | Dashboard, cadastros, relatórios da região |
| Diretor | /dashboard/inicio | Igual Admin + visão global multi-região |

Layouts: Admin/Diretor = sidebar + header (gestão). Promotor/Expedição/Supervisor = só header (operacional).
Admin/Diretor no celular: sidebar vira drawer (☰); logout/tema no header; telas desktopOnly exibem aviso mas permanecem acessíveis.

Diferenças do Diretor:
- Filtro global de região (Manaus / Rio Branco / Todas) em dashboard, expedição, relatório e cadastros
- Logos duplos no header quando visualiza todas as regiões
- **Único perfil** que pode excluir e restaurar pedidos (UI + API)

## Autenticação, senha e sessão
- Login por cookie + middleware; rotas `/dashboard/*` e `/alterar-senha` protegidas
- Conta Pendente ou Inativa → login bloqueado
- `alterarSenhaObrigatorio = true` → redireciona para `/alterar-senha` antes do dashboard
- Senha inicial padrão `123456` — não pode ser reutilizada na troca obrigatória
- Admin pode resetar senha (reativa troca obrigatória no próximo login)
- Recuperação de senha por e-mail com link temporário (mensagem genérica por segurança)
- Middleware redireciona rota não permitida ao perfil para a tela inicial do perfil

## Cadastro público e aprovação de conta
- Tela `/login` com views: login, cadastro, recuperar senha, pendente
- Cadastro self-service: nome, e-mail, região, senha — cria usuário com função `Pendente`, status `Pendente`, ativo `false`
- Pendente não faz login até Admin/Diretor aprovar: status Ativo + perfil definido + lojas vinculadas (se promotor)
- Login sempre em tema claro; marca pode mudar conforme e-mail digitado (dica visual Manaus/Rio Branco)

## Trava de aparelho (device ID) — SOMENTE Promotor
- Login envia `deviceId` do aparelho (`lib/device-id-client.ts` → `AuthFlow` → `app/api/auth/login`)
- Validação em `lib/device-id.ts` + `lib/authenticate-user.ts` (só quando `funcao === "Promotor"`)
- Usuário sem aparelho vinculado → primeiro login **vincula** automaticamente
- Aparelho diferente do cadastrado → login **bloqueado** (403)
- Mensagem: "Aparelho não autorizado para este usuário. Entre em contato com a Diretoria."
- `ignorarTravaAparelho = true` no cadastro → trava desativada para aquele usuário
- Admin/Diretor resetam aparelho em Gestão de Usuários (`/api/admin/usuarios/[id]/reset-aparelho`)
- Campos em `Usuario`: `deviceId`, `ignorarTravaAparelho`
- Outros perfis (Expedição, Admin, Diretor, Supervisor) **não** passam pela trava de aparelho

## Fluxo principal do promotor
1. Seleciona loja vinculada → validação pela **cerca virtual** (GPS Exata dentro do perímetro)
2. Preenche formulário quantitativo: Estoque, Avaria, Trocas, Pedido (SEM valores em R$)
3. Conferência → envio → status AGUARDANDO_APROVACAO
4. Principal: 1 por loja/dia. Extra: 1 por loja/dia, só após principal (estoque/avaria/trocas travados no extra)
5. Após principal + extra no dia, não há novo lançamento — orienta contato com Supervisor
6. Pedido enviado é irreversível pelo promotor; itens zerados podem ser auto-aprovados na expedição

## Check-in e visita GPS
- Check-in CLT / `VisitaGpsCheckin` **desativado** no portal (`CHECKIN_GPS_OBRIGATORIO = false`)
- Localização operacional: **somente cerca virtual**
- `inicioVisitaEm` pode aparecer no Raio-X quando houver registro de início de visita no envio
- Sem início de visita: auditoria mostra só o envio e eventos posteriores
- Histórico de pedidos **não exige** validação de GPS/cerca virtual para consulta

## Cerca virtual (GPS)
Validação quando o **promotor** tem `cercaVirtualAtiva`:
- Loja precisa estar completa: cerca ativa + perímetro > 0 + coordenadas
- Promotor com cerca + loja incompleta → pedido **bloqueado** (sem contingência)
- Promotor sem cerca → pedido segue sem validação GPS
- GPS indisponível → bloqueado
- Localização aproximada (precisão > 100 m) → bloqueado; orientar localização **Exata** no aparelho
- Fora do perímetro → bloqueado com distância
- Dentro do perímetro → permitido; `distanciaLojaMetros` gravada
- Admin/Diretor no modo gestão: sem bloqueio de cerca

Configuração da loja (cadastro):
- CEP preenche rua, bairro, cidade, UF
- Número do endereço dispara geocodificação → latitude/longitude
- Perímetro da cerca em metros no painel da loja

Check-in GPS / vínculo CLT:
- `CHECKIN_GPS_OBRIGATORIO` em `lib/pedido.ts` está **`false`**: check-in CLT desativado
- Controle de localização no portal: **somente cerca virtual**
- Campo Vínculo CLT no cadastro não bloqueia pedido

## Número amigável do pedido
- Cada pedido recebe `numeroAmigavel` sequencial único no banco
- Formato exibido: `#0001`, `#0002`… (`lib/pedido-numero-amigavel.ts` → `formatarNumeroAmigavelPedido`)
- Aparece no Relatório de Visita, Raio-X, expedição e histórico
- Busca no relatório aceita `2`, `0002` ou `#0002`
- Pedido excluído exibe status **CANCELADO** na interface de visita
- Filtro operacional ignora pedidos com status `excluido` (`filtroPedidoNaoExcluido`)

## Expedição
- Rotas: `/dashboard/expedicao` (perfil Expedição) e `/dashboard/gestao/expedicao` (Admin/Diretor com sidebar)
- Quem opera: Expedição, Admin, Diretor
- Expedição só altera pedidos do dia atual; Admin/Diretor qualquer data
- Aprova/corta itens, define origem de saída, bonificação
- Origem obrigatória quando há pedido aprovado ou troca atendida
- Status do pedido pai: Aguardando enquanto houver item pendente; Aprovado quando todos aprovados; Reprovado se todos reprovados
- Tipos exibidos: **Pedido Principal**, **Pedido Extra**, **Pedido Avulso**
- Modal de aprovação: badge de tipo acima de Promotor/Loja; portal no `document.body` para ficar acima do cabeçalho
- Transferências avulsas fora do fluxo do promotor; campo **Qtde Avulsa** no modal
- Tela rola inteira (cabeçalho + filtros + tabela)
- Fórmulas: Pedido CISS = Pedido Aprovado + Qtde Avulsa | Pedido Total = Pedido Aprovado + Troca Atendida + Qtde Avulsa + Bonificação
- Troca Atendida e Bonificação **não** entram no Pedido CISS (vai para sistema CISS da empresa)
- Origem com transferências vinculadas não pode ser excluída
- Exportar PDF (Romaneio de Conferência) e Excel
- Romaneio PDF: colunas Cód Produto, Produto, Origem, Estoque, Pedido Solicitado, Corte, Troca Atendida, Qtde Avulsa, Bonificação, Pedido CISS, Pedido Total; assinaturas Responsável Expedição e Motorista

## Dashboard Executivo — /dashboard/inicio
- Tela inicial de Admin e Diretor
- Filtros: período, região (Diretor: comparar regiões), loja, produto, promotor, dia da semana
- Cards KPI: pedidos solicitados, volume, avarias, trocas, taxa de atendimento, tempo em loja
- Abas: Geral (gráficos por loja/produto/cortes/ranking), Tendências, Avarias
- Gráficos adaptam cores ao tema claro/escuro

## Relatório de Visita — /dashboard/gestao/relatorio-visitas
- Perfis: Admin e Diretor (desktop principal; acessível no mobile com aviso)
- Cabeçalho com gradiente da marca; Diretor alterna Manaus / Rio Branco / Todas
- Filtros: data início/fim, região, promotor, loja, integridade da cerca (todos/conforme/inconforme), busca por número do pedido
- Cards de totais: visitas, conformes, inconformes
- Tabela: pedido (#amigável), data/hora, promotor, loja, tipo, tempo em loja, distância (m), farol integridade
- **Clicar na linha** abre modal Raio-X (`PedidoRaioXModal`)
- Farol integridade (`lib/relatorio-visitas.ts`): conforme se GPS válido, distância ≤ 100 m e sem coordenada suspeita (mock); senão inconforme
- Coluna de ações (excluir/restaurar) visível **somente para Diretor**

### Raio-X do pedido
Blocos do modal:
- Cabeçalho: nº amigável, status, data/hora envio, promotor, loja
- Cerca Virtual: farol, distância, check-in, check-out, tempo em loja
- Resumo: total produtos, volume, tipo (Principal/Extra), progresso conferência
- Linha do Tempo: check-in → pedido enviado → check-out → aprovações/reprovações → exclusão/restauração
- Mapa Leaflet: marcador verde (loja) + vermelho (GPS envio), linha tracejada, legenda, link externo
- Card Cerca Virtual e Linha do Tempo usam os **mesmos horários** — sem divergência

## Exclusão e restauração de pedidos — SOMENTE Diretor
- UI: botões na tabela do Relatório de Visita (`podeGerenciarPedidos = role === Diretor`)
- APIs: `POST /api/admin/pedidos/[id]/excluir` e `POST /api/admin/pedidos/[id]/restaurar` (`requireDiretorApiAccess`)
- Exclusão exige motivo; grava `status = excluido`, `motivoExclusao`, `excluidoEm`, `excluidoPorId`
- Alertas antes de excluir conforme progresso na expedição: **nenhum** / **parcial** (itens aprovados) / **crítico** (100% aprovado)
- Gera `LogAuditoria` com ação `EXCLUSAO_PEDIDO` ou `RESTAURACAO_PEDIDO`
- Restauração recupera status anterior do log de exclusão; fallback `AGUARDANDO_APROVACAO`
- Eventos de exclusão/restauração aparecem na Linha do Tempo do Raio-X
- Pedidos excluídos somem dos fluxos operacionais (filtro `filtroPedidoNaoExcluido`)

## Portal de Pedidos — histórico e modo gestão
- Abas: Portal (`/dashboard/portal-pedidos`) e Histórico (`?aba=historico`)
- Histórico: filtros por data, status, produto, loja, pendentes; API `/api/pedidos/historico`
- Desktop: tabela ampla; Mobile: cards com tema dark (cards, filtros, badges, transferência avulsa com Qtde Avulsa)
- Pedido Extra no card: status próprio ao lado (Aprovado verde / Reprovado vermelho / Pendente âmbar)
- Pedido Atendido e Trocas Atendidas: em branco se Pendente; valor se Aprovado; `0` se Reprovado
- Conferência do pedido extra: só produto + quantidade > 0 (sem estoque/avaria/trocas do principal)
- Modo gestão Admin/Diretor: filtros Região → Promotor → Loja; sem bloqueio de cerca; histórico do promotor selecionado
- Parâmetros URL: `?abrirFormulario=1`, `?pedidoExtra=1`

## Tema claro/escuro
- `ThemeProvider` + `lib/theme-aparencia.ts`; preferência em localStorage; classe `dark` no `<html>`
- Toggle: rodapé da sidebar (desktop Admin/Diretor) e header (mobile + operacional)
- **Login, cadastro e recuperar senha: sempre tema claro** — não herdam dark mode
- Dashboard Executivo: gráficos adaptam cores ao tema
- Histórico mobile do promotor: layout dark completo (cards, filtros, seções)
- Cadastros admin, Relatório de Visita e portal gestão: classes `dark:` para legibilidade no modo escuro
- Telas `desktopOnly` mantêm aviso no mobile; layout desktop (`lg+`) inalterado

## Banco — tabelas principais
Regiao, Produto, Loja, LojaProduto, Usuario, UsuarioLoja, UsuarioRegiao, Pedido, ItemPedido, Origem, TransferenciaAvulsa, LogPedidoExpedicao, LogAuditoria, LogCheckIn, ControlePedidoLojaDia, TokenRecuperacaoSenha

Usuario: `deviceId`, `ignorarTravaAparelho`, `cercaVirtualAtiva`, `alterarSenhaObrigatorio`, `statusConta`, `clt`.
Loja: endereço, latitude/longitude, cerca virtual (ativa, perímetro), produtos via `LojaProduto`.
Pedido: `numeroAmigavel`, `tipoLancamento` (principal/complementar), `inicioVisitaEm`, `latitudeEnvio`/`longitudeEnvio`, `distanciaLojaMetros`, soft delete (`motivoExclusao`, `excluidoEm`, `excluidoPorId`).
ControlePedidoLojaDia: controla 1 principal + 1 extra por loja/dia.
Logs: `LogAuditoria` (exclusões, cadastros), `LogPedidoExpedicao` (aprovações), `LogCheckIn` (visitas).

## Branches e ambientes
- `main` = produção/teste estável — push aciona deploy automático na Vercel
- Branches `feature/*` = desenvolvimento isolado (ex.: `feature/sugestao-pedidos`)
- Não desenvolver na `main` sem instrução explícita; não misturar alterações entre branches
- Banco Neon pode ter branch dedicada por feature (ex.: `feature-sugestao-pedidos`) — separado da produção
- Antes de codar: confirmar branch (`git branch`) e não commitar schema/migrate sem aprovação

## Estrutura de pastas
- app/ — rotas (App Router), APIs em app/api/
- components/ — UI por domínio (admin, dashboard, expedicao, login, theme)
- lib/ — regras de negócio, RBAC, pedido, expedição, cerca, sessão, tema
- prisma/ — schema e migrations
- Documentacao/ — docs 01 a 05

## Deploy
- package.json tem script "postinstall" rodando "prisma generate" — necessário para o build funcionar na Vercel. Não remover nem alterar sem aviso.
- Commits devem sempre usar o e-mail da conta GitHub do usuário (laisoncosta) — nunca e-mail genérico de agente/IA, para não bloquear o deploy na Vercel.
- Push para a branch main aciona deploy automático em produção — reforça a regra de nunca dar push sem aprovação explícita.

## Arquivos-chave
- lib/rbac.ts — perfis, rotas, sidebar
- lib/pedido.ts, lib/cerca-virtual.ts — regras promotor e GPS
- lib/device-id.ts, lib/device-id-client.ts — trava de aparelho (device ID)
- lib/authenticate-user.ts — login, validação de senha e trava
- lib/expedicao.ts — painel expedição, status e fórmulas CISS/Total
- lib/pedido-numero-amigavel.ts — número amigável, busca, filtro exclusão
- lib/pedido-raio-x.ts — Raio-X, linha do tempo, eventos exclusão/restauração
- lib/relatorio-visitas.ts — farol integridade, filtros, totais do relatório
- lib/theme-aparencia.ts — tema claro/escuro
- lib/auth-guard.ts — `requireDiretorApiAccess` (exclusão/restauração)
- components/dashboard/PortalPedidosPainel.tsx — portal promotor e modo gestão
- components/dashboard/HistoricoPedidos.tsx — histórico (desktop + mobile dark)
- components/dashboard/DashboardGestaoMobileNav.tsx — drawer mobile Admin/Diretor
- components/expedicao/ExpedicaoPainel.tsx — expedição
- components/admin/RelatorioVisitasPainel.tsx — relatório visita, exclusão/restauração
- components/admin/PedidoRaioXModal.tsx — modal Raio-X com mapa
- components/admin/GestaoUsuariosCatalogo.tsx — usuários, trava aparelho, vínculo lojas
- components/theme/ThemeProvider.tsx — provider de tema
- middleware — proteção de rotas e senha obrigatória

## Cadastros administrativos
- Produtos, Lojas, Origens, Usuários — importação/exportação Excel
- Lojas: endereço, geocodificação, cerca virtual, checklist de produtos (`LojaProduto`)
- Gestão de Usuários: reset senha, reset aparelho, ignorar trava, cerca virtual (promotor), vínculo lojas promotor (com busca por nome)
- Origens: não excluir se houver transferências vinculadas
- Cadastros (produtos, lojas, usuários): rolagem livre da página (cabeçalho e filtros sobem com a tabela)

## Convenções de código
- TypeScript estrito; reutilizar funções e padrões existentes
- Mudanças mínimas e focadas — não refatorar o que não foi pedido
- Comentários só para lógica de negócio não óbvia
- Datas operacionais no fuso Brasil
- Não commitar .env nem credenciais
- Nunca alterar prisma/schema.prisma ou criar/rodar migrations no banco sem aprovação explícita do usuário nesta conversa.
- Se uma instrução for ambígua, ou puder afetar RBAC, dados existentes, ou mais de uma tela ao mesmo tempo, parar e perguntar antes de implementar.

## Preferências do projeto (obrigatório)
- Responder em **português**
- Documentação em Documentacao/ — um arquivo por tema, não por tela
- **Só commitar quando o usuário aprovar explicitamente**
- Não fazer push sem pedido explícito
- Atualizar Documentacao/ e CHANGELOG.md quando mudança afetar telas ou regras
- Placeholders ativos: /dashboard/supervisor, /dashboard/fechamento

## Documentação completa
- Documentacao/01-Visao_Geral.md
- Documentacao/02-Regras-Negocios.md
- Documentacao/03-Telas.md
- Documentacao/04-Banco-Dados.md
- Documentacao/05-Prompt-Mestre.md (este arquivo)

Quando em dúvida sobre regra de negócio ou tela, consulte esses arquivos antes de implementar.
```

---

## O que este prompt cobre

| Tema | Resumo no prompt | Detalhe completo em |
|---|---|---|
| Contexto e stack | Sim | `01-Visao_Geral.md` |
| Regras de negócio | Essencial | `02-Regras-Negocios.md` |
| Telas e rotas | Principais + histórico mobile | `03-Telas.md` |
| Banco de dados | Tabelas-chave e campos críticos | `04-Banco-Dados.md` |
| Trava de aparelho (device ID) | Sim | `02-Regras-Negocios.md` §5, `lib/device-id.ts` |
| Autenticação e senha | Sim | `02-Regras-Negocios.md` §4 |
| Cadastro público e aprovação | Sim | `02-Regras-Negocios.md` §3 |
| Cerca virtual (promotor ativo + loja completa) | Sim | `02-Regras-Negocios.md` §7, `lib/cerca-virtual.ts` |
| Check-in CLT (desativado) / visita | Sim | `02-Regras-Negocios.md` §7–8, `lib/pedido.ts` |
| Número amigável do pedido | Sim | `lib/pedido-numero-amigavel.ts` |
| Relatório de Visita / Raio-X | Sim | `03-Telas.md` §7, `lib/relatorio-visitas.ts` |
| Exclusão e restauração (Diretor) | Sim | `app/api/admin/pedidos/[id]/excluir`, `restaurar` |
| Linha do tempo do pedido | Sim | `lib/pedido-raio-x.ts` |
| Dashboard Executivo | Sim | `03-Telas.md` §6 |
| Expedição (fórmulas, romaneio PDF) | Sim | `02-Regras-Negocios.md` §10 |
| Tema claro/escuro | Sim | `lib/theme-aparencia.ts`, `ThemeProvider` |
| Mobile Admin/Diretor | Sim | `03-Telas.md` §15 |
| Branches e ambientes | Sim | Este arquivo |
| Cadastros (Excel, geocoding, rolagem) | Sim | `03-Telas.md` §9–12 |
| Convenções de código | Sim | Código-fonte + este arquivo |

---

## Quando complementar o prompt

Adicione contexto extra quando a tarefa envolver:

| Situação | O que anexar ou pedir |
|---|---|
| Nova tela ou rota | `03-Telas.md` + componente similar existente |
| Regra de validação | `02-Regras-Negocios.md` + `lib/` correspondente |
| Campo novo no banco | `04-Banco-Dados.md` + `prisma/schema.prisma` |
| Trava de aparelho / login promotor | `02-Regras-Negocios.md` §5 + `lib/device-id.ts` + `lib/authenticate-user.ts` |
| Bug em expedição | `components/expedicao/` + `lib/expedicao.ts` |
| Bug no portal promotor | `components/dashboard/PortalPedidosPainel.tsx` + `lib/pedido.ts` |
| Histórico mobile / dark mode | `components/dashboard/HistoricoPedidos.tsx` |
| Auditoria / Raio-X / linha do tempo | `lib/pedido-raio-x.ts` + `PedidoRaioXModal.tsx` |
| Relatório de visita / farol integridade | `lib/relatorio-visitas.ts` + `RelatorioVisitasPainel.tsx` |
| Exclusão ou restauração de pedido | `lib/auth-guard.ts` + rotas `excluir`/`restaurar` + `RelatorioVisitasPainel.tsx` |
| Número amigável / busca de pedido | `lib/pedido-numero-amigavel.ts` |
| Tema claro/escuro | `lib/theme-aparencia.ts` + `ThemeProvider.tsx` |
| Dashboard executivo / KPIs | `app/dashboard/inicio/` + APIs de dashboard |
| Feature em branch isolada | Confirmar branch atual + banco Neon da feature |

---

## Exemplos de tarefas

Cole o prompt mestre e acrescente uma destas linhas:

```
Tarefa: Adicionar filtro por status na tabela do Relatório de Visita.
```

```
Tarefa: Corrigir erro ao aprovar pedido extra na expedição — descrevo o passo a passo: […]
```

```
Tarefa: Documentar nova regra de negócio no 02-Regras-Negocios.md após alteração em lib/cerca-virtual.ts.
```

---

## Manutenção

Atualize este arquivo quando houver mudanças estruturais:

- Novo perfil ou rota importante
- Nova tabela ou campo crítico no banco
- Mudança de stack ou deploy
- Nova convenção acordada com o time
- Regras de autenticação, trava de aparelho, exclusão de pedidos ou fluxo mobile
- Novas telas com comportamento de tema ou auditoria

Mantenha o bloco **"Prompt para colar"** sempre sincronizado com os docs `01` a `04`.
