-- Ricostruzione stati_contratti con ID fissi 1-8 (pigliacelli)
-- SENZA DELETE: compatibile con FK contratti_stato_contratti_fk
--
-- Situazione attuale:
--   1 = In attesa
--   2 = Completato
--   3 = Rifiutato
--   4 = Da revisionare
--
-- Situazione target:
--   1 = Da inviare al subvettore
--   2 = Inviato al subvettore
--   3 = Compilato dal subvettore
--   4 = In attesa della firma subvettore
--   5 = In attesa della firma committente
--   6 = Completato
--   7 = Rifiutato dal subvettore
--   8 = Rifiutato dal committente
--
-- Backup consigliato:
--   SELECT * FROM stati_contratti;
--   SELECT id, stato_contratto_id, firmato_il FROM contratti;

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1) Inserisce gli ID 5-8 (devono esistere PRIMA del remap contratti)
-- ---------------------------------------------------------------------------
INSERT INTO stati_contratti (id, nome)
SELECT v.id, v.nome
FROM (
    SELECT 5 AS id, 'In attesa della firma committente' AS nome
    UNION ALL SELECT 6, 'Completato'
    UNION ALL SELECT 7, 'Rifiutato dal subvettore'
    UNION ALL SELECT 8, 'Rifiutato dal committente'
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM stati_contratti s WHERE s.id = v.id
);

-- ---------------------------------------------------------------------------
-- 2) Rimappa contratti sui nuovi ID (ordine anti-collisione)
-- ---------------------------------------------------------------------------

UPDATE contratti
SET stato_contratto_id = 1
WHERE stato_contratto_id IS NULL;

UPDATE contratti
SET stato_contratto_id = 7
WHERE stato_contratto_id = 3;

UPDATE contratti
SET stato_contratto_id = 6
WHERE stato_contratto_id = 2;

UPDATE contratti
SET stato_contratto_id = 3
WHERE stato_contratto_id = 4;

UPDATE contratti
SET stato_contratto_id = 4
WHERE stato_contratto_id = 1
  AND (firmato_il IS NULL OR firmato_il = '0000-00-00 00:00:00');

UPDATE contratti
SET stato_contratto_id = 5
WHERE stato_contratto_id = 1
  AND firmato_il IS NOT NULL
  AND firmato_il <> '0000-00-00 00:00:00';

-- ---------------------------------------------------------------------------
-- 3) Aggiorna nomi su ID 1-4 (nessuna DELETE, FK sempre rispettata)
-- ---------------------------------------------------------------------------
UPDATE stati_contratti SET nome = 'Da inviare al subvettore' WHERE id = 1;
UPDATE stati_contratti SET nome = 'Inviato al subvettore' WHERE id = 2;
UPDATE stati_contratti SET nome = 'Compilato dal subvettore' WHERE id = 3;
UPDATE stati_contratti SET nome = 'In attesa della firma subvettore' WHERE id = 4;

ALTER TABLE stati_contratti AUTO_INCREMENT = 9;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifica
-- ---------------------------------------------------------------------------
SELECT id, nome FROM stati_contratti ORDER BY id;

SELECT c.stato_contratto_id, st.nome, COUNT(*) AS n_contratti
FROM contratti c
LEFT JOIN stati_contratti st ON st.id = c.stato_contratto_id
GROUP BY c.stato_contratto_id, st.nome
ORDER BY c.stato_contratto_id;

SELECT c.id, c.stato_contratto_id
FROM contratti c
LEFT JOIN stati_contratti st ON st.id = c.stato_contratto_id
WHERE c.stato_contratto_id IS NOT NULL AND st.id IS NULL;
