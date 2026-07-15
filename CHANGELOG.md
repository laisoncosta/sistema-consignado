# Changelog

[15/07/2026] - Ajustado: trava de aparelho (Device ID) restrita ao perfil **Promotor** — ADM, Diretor, Expedição e Supervisor não passam pela validação; controles de reset/trava só aparecem no cadastro de Promotor; ao mudar o perfil, `deviceId` e exceção emergencial são limpos.

[15/07/2026] - Ajustado: filtros em cascata na Expedição (loja por promotor; produto e status só do que está na tela); botão **Imprimir Romaneio** (só com promotor e loja definidos) ao lado do Status; **Exportar Excel** com visual verde; Relatório de Visita com promotor antes da loja, filtros dependentes e cards de região na ordem Todos → Rio Branco → Manaus.

[14/07/2026] - Documentado: check-in CLT desativado em todos os docs; portal usa apenas cerca virtual para liberar pedido.

[14/07/2026] - Removido: bloqueio de check-in CLT no portal de pedidos; localização passa a depender só da cerca virtual (mensagem "Área Bloqueada" removida).

[13/07/2026] - Ajustado: cerca virtual reforçada (GPS obrigatório, precisão Exata, bloqueio se loja incompleta); conferência do pedido extra só com produto/quantidade; histórico com status do extra e quantidades atendidas conforme status; modais de expedição acima do cabeçalho com tipo de pedido destacado.

[11/07/2026] - Ajustado: rolagem livre da página nas telas Cadastro de Produtos, Cadastro de Lojas e Gestão de Usuários e Perfis; cabeçalhos e filtros não ficam mais presos no topo.

[11/07/2026] - Adicionado: campo de busca por nome na vinculação de lojas do promotor (Gestão de Usuários).

[10/07/2026] - Adicionado: acesso mobile otimizado para Admin e Diretor — drawer de navegação, logout/tema no cabeçalho, portal em modo gestão com toque amigável; telas desktopOnly acessíveis no celular com aviso.

[10/07/2026] - Corrigido: consulta de histórico no celular adaptada ao tema dark; label Qtde Avulsa alinhada ao romaneio de expedição.

[09/07/2026] - Ajustado: coluna Pedido Total na expedição reposicionada após Bonificação (antes de Data); romaneio PDF com Qtde Avulsa, Pedido CISS e Pedido Total integrados.

[09/07/2026] - Ajustado: tela de Expedição rola inteira; removido gráfico do Relatório de Visita; mapa do Raio-X migrado para Leaflet com marcadores fixos (substitui imagem estática que não carregava).

[09/07/2026] - Corrigido: telas de cadastro não se adaptavam ao modo escuro; adicionada detecção automática do tema do sistema operacional.
