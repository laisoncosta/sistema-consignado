-- Normaliza e-mails de login já existentes para minúsculas.
UPDATE "Usuario"
SET "usuario" = LOWER(BTRIM("usuario"))
WHERE "usuario" <> LOWER(BTRIM("usuario"));

-- Impede cadastro duplicado no banco (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_usuario_lower_key"
ON "Usuario" (LOWER("usuario"));
