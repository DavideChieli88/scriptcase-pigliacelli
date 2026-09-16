-- Onboarding wizard: autisti senza contratto ancora.
-- Se subvettore_contratto_id è NOT NULL o ha FK stretta, INSERT con 0/NULL fallisce.
--
-- Verifica:
--   SHOW CREATE TABLE subvettori_autisti;
--   SELECT id FROM subvettori_contratti WHERE id = 0;  -- deve essere vuoto

-- 1) Normalizza eventuali 0 residui
UPDATE subvettori_autisti
SET subvettore_contratto_id = NULL
WHERE subvettore_contratto_id = 0;

-- 2) Colonna nullable (adatta il nome FK se diverso da SHOW CREATE TABLE)
-- ALTER TABLE subvettori_autisti DROP FOREIGN KEY <nome_fk_subvettore_contratto_id>;

ALTER TABLE subvettori_autisti
  MODIFY COLUMN subvettore_contratto_id INT NULL DEFAULT NULL;

-- ALTER TABLE subvettori_autisti
--   ADD CONSTRAINT subvettori_autisti_contratto_fk
--   FOREIGN KEY (subvettore_contratto_id) REFERENCES subvettori_contratti(id)
--   ON DELETE SET NULL ON UPDATE CASCADE;
