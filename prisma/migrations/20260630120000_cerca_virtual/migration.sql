-- Parâmetros de Cerca Virtual (loja e promotor)
ALTER TABLE "Loja" ADD COLUMN "cercaVirtualAtiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Loja" ADD COLUMN "perimetroCerca" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Usuario" ADD COLUMN "cercaVirtualAtiva" BOOLEAN NOT NULL DEFAULT false;
