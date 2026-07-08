-- Etapa 4: auditoria antifraude — coordenadas e distância no envio do pedido
ALTER TABLE "Pedido" ADD COLUMN "latitudeEnvio" DOUBLE PRECISION;
ALTER TABLE "Pedido" ADD COLUMN "longitudeEnvio" DOUBLE PRECISION;
ALTER TABLE "Pedido" ADD COLUMN "distanciaLojaMetros" DOUBLE PRECISION;
