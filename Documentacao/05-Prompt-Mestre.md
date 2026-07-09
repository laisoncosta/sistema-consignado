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
| Promotor | /dashboard/portal-pedidos | Portal de pedidos, check-in GPS, histórico |
| Expedição | /dashboard/expedicao | Aprovação/corte, transferências avulsas |
| Supervisor | /dashboard/supervisor | Placeholder |
| Administrador | /dashboard/inicio | Dashboard, cadastros, relatórios da região |
| Diretor | /dashboard/inicio | Igual Admin + visão global multi-região |

Layouts: Admin/Diretor = sidebar + header (gestão). Promotor/Expedição/Supervisor = só header (operacional).

## Fluxo principal do promotor
1. Seleciona loja vinculada → check-in GPS (inicioVisitaEm)
2. Preenche formulário quantitativo: Estoque, Avaria, Trocas, Pedido (SEM valores em R$)
3. Conferência → envio → status AGUARDANDO_APROVACAO
4. Principal: 1 por loja/dia. Extra: 1 por loja/dia, só após principal.

## Cerca virtual (GPS)
Validação só quando: promotor com cerca ativa + loja com cerca ativa + perímetro > 0 + coordenadas.
- Dentro do perímetro → pedido permitido, distância gravada
- Fora → bloqueado
- Admin/Diretor no modo gestão: sem bloqueio de cerca

## Expedição
- Aprova/corta itens, define origem de saída, bonificação
- Expedição só altera pedidos do dia atual; Admin/Diretor qualquer data
- Transferências avulsas fora do fluxo do promotor
- Tela rola inteira (cabeçalho + filtros + tabela)

## Relatório de Visita / Raio-X
- Admin/Diretor auditam visitas em loja
- Raio-X: Cerca Virtual, Resumo, Linha do Tempo, Mapa Leaflet
- Linha do tempo: check-in → envio → check-out → eventos expedição
- Mapa: marcador verde (loja) + vermelho (GPS envio), fixos, sem gráfico de permanência

## Banco — tabelas principais
Regiao, Produto, Loja, LojaProduto, Usuario, UsuarioLoja, UsuarioRegiao, Pedido, ItemPedido, Origem, TransferenciaAvulsa, LogPedidoExpedicao, LogAuditoria, LogCheckIn, ControlePedidoLojaDia, TokenRecuperacaoSenha

Pedido guarda: numeroAmigavel, tipoLancamento (principal/extra), inicioVisitaEm, latitudeEnvio/longitudeEnvio, distanciaLojaMetros, soft delete (motivoExclusao, excluidoEm).

## Estrutura de pastas
- app/ — rotas (App Router), APIs em app/api/
- components/ — UI por domínio (admin, dashboard, expedicao, login, theme)
- lib/ — regras de negócio, RBAC, pedido, expedição, cerca, sessão
- prisma/ — schema e migrations
- Documentacao/ — docs 01 a 05

## Arquivos-chave
- lib/rbac.ts — perfis, rotas, sidebar
- lib/pedido.ts, lib/cerca-virtual.ts — regras promotor
- lib/expedicao.ts — painel expedição
- lib/pedido-raio-x.ts — Raio-X e linha do tempo
- components/dashboard/PortalPedidosPainel.tsx — portal promotor
- components/expedicao/ExpedicaoPainel.tsx — expedição
- components/admin/RelatorioVisitasPainel.tsx — relatório visita
- middleware — proteção de rotas e senha obrigatória

## Convenções de código
- TypeScript estrito; reutilizar funções e padrões existentes
- Mudanças mínimas e focadas — não refatorar o que não foi pedido
- Comentários só para lógica de negócio não óbvia
- Tema claro/escuro via ThemeProvider; login sempre claro
- Datas operacionais no fuso Brasil
- Não commitar .env nem credenciais

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
| Telas e rotas | Principais | `03-Telas.md` |
| Banco de dados | Tabelas-chave | `04-Banco-Dados.md` |
| Convenções de código | Sim | Código-fonte + este arquivo |

---

## Quando complementar o prompt

Adicione contexto extra quando a tarefa envolver:

| Situação | O que anexar ou pedir |
|---|---|
| Nova tela ou rota | `03-Telas.md` + componente similar existente |
| Regra de validação | `02-Regras-Negocios.md` + `lib/` correspondente |
| Campo novo no banco | `04-Banco-Dados.md` + `prisma/schema.prisma` |
| Bug em expedição | `components/expedicao/` + `lib/expedicao.ts` |
| Bug no portal promotor | `components/dashboard/PortalPedidosPainel.tsx` + `lib/pedido.ts` |
| Auditoria / Raio-X | `lib/pedido-raio-x.ts` + `PedidoRaioXModal.tsx` |

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

Mantenha o bloco **"Prompt para colar"** sempre sincronizado com os docs `01` a `04`.
