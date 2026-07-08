-- Numeração sequencial amigável e campos de exclusão lógica (soft delete).

ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "numeroAmigavel" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "motivoExclusao" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "excluidoEm" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "excluidoPorId" INTEGER;

UPDATE "Pedido"
SET "numeroAmigavel" = "id"
WHERE "numeroAmigavel" IS NULL;

ALTER TABLE "Pedido" ALTER COLUMN "numeroAmigavel" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Pedido_numeroAmigavel_key" ON "Pedido"("numeroAmigavel");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Pedido_excluidoPorId_fkey'
  ) THEN
    ALTER TABLE "Pedido"
      ADD CONSTRAINT "Pedido_excluidoPorId_fkey"
      FOREIGN KEY ("excluidoPorId") REFERENCES "Usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
