-- Migration: stati contratto granulari (pigliacelli)
-- Eseguire su UAT, poi prod. Idempotente: rieseguibile senza duplicare righe.

-- 1) Nuovi stati (skip se già presenti)
INSERT INTO stati_contratti (nome)
SELECT v.nome
FROM (
    SELECT 'Da inviare al subvettore' AS nome
    UNION ALL SELECT 'Inviato al subvettore'
    UNION ALL SELECT 'Compilato dal subvettore'
    UNION ALL SELECT 'In attesa della firma subvettore'
    UNION ALL SELECT 'In attesa della firma committente'
    UNION ALL SELECT 'Completato'
    UNION ALL SELECT 'Rifiutato dal subvettore'
    UNION ALL SELECT 'Rifiutato dal committente'
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM stati_contratti sc WHERE sc.nome = v.nome
);

-- 2) Remap contratti esistenti (vecchi nomi → nuovi)

-- NULL → Da inviare al subvettore
UPDATE contratti c
SET c.stato_contratto_id = (
    SELECT id FROM stati_contratti WHERE nome = 'Da inviare al subvettore' LIMIT 1
)
WHERE c.stato_contratto_id IS NULL;

-- Da revisionare → Compilato dal subvettore
UPDATE contratti c
INNER JOIN stati_contratti st ON st.id = c.stato_contratto_id AND st.nome = 'Da revisionare'
SET c.stato_contratto_id = (
    SELECT id FROM stati_contratti WHERE nome = 'Compilato dal subvettore' LIMIT 1
);

-- In attesa (subvettore non ha ancora firmato) → In attesa della firma subvettore
UPDATE contratti c
INNER JOIN stati_contratti st ON st.id = c.stato_contratto_id AND st.nome = 'In attesa'
SET c.stato_contratto_id = (
    SELECT id FROM stati_contratti WHERE nome = 'In attesa della firma subvettore' LIMIT 1
)
WHERE c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00';

-- In attesa (subvettore già firmato) → In attesa della firma committente
UPDATE contratti c
INNER JOIN stati_contratti st ON st.id = c.stato_contratto_id AND st.nome = 'In attesa'
SET c.stato_contratto_id = (
    SELECT id FROM stati_contratti WHERE nome = 'In attesa della firma committente' LIMIT 1
)
WHERE c.firmato_il IS NOT NULL AND c.firmato_il <> '0000-00-00 00:00:00';

-- Rifiutato (generico) → Rifiutato dal subvettore (best effort su dati storici)
UPDATE contratti c
INNER JOIN stati_contratti st ON st.id = c.stato_contratto_id AND st.nome = 'Rifiutato'
SET c.stato_contratto_id = (
    SELECT id FROM stati_contratti WHERE nome = 'Rifiutato dal subvettore' LIMIT 1
);

-- 3) Rimuovi stati obsoleti (solo se nessun contratto li referenzia più)
DELETE FROM stati_contratti
WHERE nome IN ('Da revisionare', 'In attesa', 'Rifiutato')
  AND NOT EXISTS (
      SELECT 1 FROM contratti c WHERE c.stato_contratto_id = stati_contratti.id
  );

-- Verifica post-migration:
-- SELECT st.nome, COUNT(*) FROM contratti c LEFT JOIN stati_contratti st ON st.id = c.stato_contratto_id GROUP BY st.nome;
