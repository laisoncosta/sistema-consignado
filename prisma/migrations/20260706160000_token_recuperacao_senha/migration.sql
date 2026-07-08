-- CreateTable
CREATE TABLE "TokenRecuperacaoSenha" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperacaoSenha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacaoSenha_token_key" ON "TokenRecuperacaoSenha"("token");

-- CreateIndex
CREATE INDEX "TokenRecuperacaoSenha_usuarioId_idx" ON "TokenRecuperacaoSenha"("usuarioId");

-- CreateIndex
CREATE INDEX "TokenRecuperacaoSenha_expiresAt_idx" ON "TokenRecuperacaoSenha"("expiresAt");

-- AddForeignKey
ALTER TABLE "TokenRecuperacaoSenha" ADD CONSTRAINT "TokenRecuperacaoSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
