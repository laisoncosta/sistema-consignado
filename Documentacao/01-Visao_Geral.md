# Visão Geral — Sistema Consignado

## O que é

O **Sistema Integrado de Pedidos Consignados** é uma aplicação web para gestão de pedidos consignados em campo. Ele conecta promotores, expedição, supervisão e gestão administrativa em um único fluxo digital.

O sistema cobre o ciclo principal:

1. **Promotor** visita a loja, registra estoque, avarias, trocas e solicita pedido.
2. **Expedição** analisa, aprova ou corta itens e define origem de saída.
3. **Gestão** administra catálogos (produtos, lojas, usuários, origens) e acompanha indicadores.

---

## Para quem serve

| Perfil | Função principal | Tela inicial após login |
|---|---|---|
| **Promotor** | Visitas em lojas, lançamento de pedidos com cerca virtual | Portal de Pedidos |
| **Expedição** | Aprovação e conferência de pedidos, transferências avulsas | Painel de Expedição |
| **Supervisor** | Acompanhamento operacional da região | Dashboard Supervisor |
| **Administrador** | Cadastros, usuários, relatórios e configurações | Dashboard Início |
| **Diretor** | Visão executiva e gestão ampla | Dashboard Início |

Usuários com cadastro público entram como **Pendente** até aprovação de um Administrador ou Diretor.

---

## Regiões e marcas

O sistema opera em duas regiões, cada uma com identidade visual própria:

| Região | Marca | Cor principal |
|---|---|---|
| **Manaus** | Viva Ecológicos | Verde |
| **Rio Branco** | Buriti | Vermelho |

A região do usuário define tema, logo e escopo de dados (produtos, lojas, pedidos).

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend / Backend | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7 |
| Estilização | Tailwind CSS 4 |
| Autenticação | Sessão via cookie (middleware) |
| Hospedagem | Vercel (produção) |

---

## Ambientes

| Ambiente | URL / uso |
|---|---|
| **Local** | `http://localhost:3000` — desenvolvimento (`npm run dev`) |
| **Produção** | `https://sistema-consignado-seven.vercel.app` — Vercel |

Variáveis sensíveis (banco, e-mail, URL do app) ficam no arquivo `.env` local e nas **Variáveis de Ambiente** da Vercel. Esse arquivo **nunca** vai para o GitHub.

---

## Estrutura da documentação

| Ordem | Arquivo | Conteúdo |
|---|---|---|
| 1 | `01-Visao_Geral.md` | Contexto geral do sistema |
| 2 | `02-Regras-Negocios.md` | Regras de negócio e validações |
| 3 | `03-Telas.md` | Rotas, telas e fluxos de interface |
| 4 | `04-Banco-Dados.md` | Tabelas, relacionamentos e migrations |
| 5 | `05-Prompt-Mestre.md` | Prompt base para uso com IA no projeto |

---

## Repositório e deploy

- **GitHub:** https://github.com/laisoncosta/sistema-consignado
- **Branch principal:** `main`
- **Deploy:** automático na Vercel a cada push na `main`
