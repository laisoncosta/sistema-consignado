-- Trava de aparelho único por usuário
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "ignorarTravaAparelho" BOOLEAN NOT NULL DEFAULT false;

-- Índices de alta busca em Pedido (numero_pedido → numeroAmigavel, data_envio → createdAt)
CREATE INDEX IF NOT EXISTS "Pedido_numeroAmigavel_idx" ON "Pedido"("numeroAmigavel");
CREATE INDEX IF NOT EXISTS "Pedido_createdAt_idx" ON "Pedido"("createdAt");
CREATE INDEX IF NOT EXISTS "Pedido_lojaId_idx" ON "Pedido"("lojaId");
CREATE INDEX IF NOT EXISTS "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");
CREATE INDEX IF NOT EXISTS "Pedido_status_idx" ON "Pedido"("status");
CREATE INDEX IF NOT EXISTS "Pedido_regiaoId_createdAt_idx" ON "Pedido"("regiaoId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pedido_lojaId_createdAt_idx" ON "Pedido"("lojaId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pedido_usuarioId_createdAt_idx" ON "Pedido"("usuarioId", "createdAt");

-- Índices em ItemPedido para expedição
CREATE INDEX IF NOT EXISTS "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");
CREATE INDEX IF NOT EXISTS "ItemPedido_status_idx" ON "ItemPedido"("status");
CREATE INDEX IF NOT EXISTS "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");
