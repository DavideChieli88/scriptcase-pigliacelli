-- =============================================================================
-- migration_sal_2026_09_16_p0_p1.sql
-- SAL 16/09/2026 — P0 + P1 (mezzi/autisti/anagrafica/tipi ANGA-Rentri)
-- Database: pigliacelli
-- Idempotente dove possibile (procedure ADD COLUMN se manca).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) subvettori_mezzi: categorie rifiuti (spostate da autisti)
-- ---------------------------------------------------------------------------
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori_mezzi ADD COLUMN has_cat_trasp_rifiuti_1 TINYINT(1) NOT NULL DEFAULT 0 AFTER scadenza_assicurazioni',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori_mezzi' AND COLUMN_NAME = 'has_cat_trasp_rifiuti_1'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori_mezzi ADD COLUMN has_cat_trasp_rifiuti_4 TINYINT(1) NOT NULL DEFAULT 0 AFTER has_cat_trasp_rifiuti_1',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori_mezzi' AND COLUMN_NAME = 'has_cat_trasp_rifiuti_4'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori_mezzi ADD COLUMN has_cat_trasp_rifiuti_5 TINYINT(1) NOT NULL DEFAULT 0 AFTER has_cat_trasp_rifiuti_4',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori_mezzi' AND COLUMN_NAME = 'has_cat_trasp_rifiuti_5'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- tipo_veicolo: vincolare in IDE a Trattore|Semirimorchio (VARCHAR già presente)

-- ---------------------------------------------------------------------------
-- 2) subvettori: campi anagrafica dichiarazioni (P1)
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN cod_fiscale_rappresentante VARCHAR(32) NULL DEFAULT NULL AFTER data_nascita_rappresentante',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'cod_fiscale_rappresentante'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN residenza_citta_rappresentante VARCHAR(255) NULL DEFAULT NULL AFTER cod_fiscale_rappresentante',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'residenza_citta_rappresentante'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN residenza_prov_rappresentante VARCHAR(16) NULL DEFAULT NULL AFTER residenza_citta_rappresentante',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'residenza_prov_rappresentante'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN residenza_indirizzo_rappresentante VARCHAR(255) NULL DEFAULT NULL AFTER residenza_prov_rappresentante',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'residenza_indirizzo_rappresentante'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN residenza_civico_rappresentante VARCHAR(32) NULL DEFAULT NULL AFTER residenza_indirizzo_rappresentante',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'residenza_civico_rappresentante'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Albo conto terzi: numero (spesso già presente) + provincia (P1 SAL 16/09)
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN num_iscrizione_albo VARCHAR(64) NULL DEFAULT NULL AFTER pec',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'num_iscrizione_albo'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN provincia_albo VARCHAR(16) NULL DEFAULT NULL AFTER num_iscrizione_albo',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'provincia_albo'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN banca VARCHAR(255) NULL DEFAULT NULL AFTER provincia_albo',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'banca'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN iban VARCHAR(64) NULL DEFAULT NULL AFTER banca',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'iban'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE subvettori ADD COLUMN codice_destinatario_sdi VARCHAR(16) NULL DEFAULT NULL AFTER iban',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'subvettori' AND COLUMN_NAME = 'codice_destinatario_sdi'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------------------------------------------------------------------------
-- 3) Tipi documento ANGA / RENTRI per categoria mezzo (P1)
--    Canonici esistenti: 11 ANGA, 12 Ricevuta ANGA, 13 RENTRI, 14 Ricevuta RENTRI
--    → rinominati come Cat.1; aggiunti Cat.4 e Cat.5 se mancano.
--    Aziendali step 4: non più mandatory/precarica (obbligo sul mezzo).
-- ---------------------------------------------------------------------------

UPDATE tipi_documento
SET nome = 'Autorizzazione ANGA Cat.1',
    mandatory = 0,
    from_preset = 0,
    flag_possesso = 0,
    is_readonly = 0
WHERE id = 11;

UPDATE tipi_documento
SET nome = 'Ricevuta pagamento ANGA Cat.1',
    mandatory = 0,
    from_preset = 0,
    flag_possesso = 0,
    is_readonly = 0
WHERE id = 12;

UPDATE tipi_documento
SET nome = 'Iscrizione RENTRI Cat.1',
    mandatory = 0,
    from_preset = 0,
    flag_possesso = 0,
    is_readonly = 0
WHERE id = 13;

UPDATE tipi_documento
SET nome = 'Ricevuta pagamento RENTRI Cat.1',
    mandatory = 0,
    from_preset = 0,
    flag_possesso = 0,
    is_readonly = 0
WHERE id = 14;

-- Cat.4
INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Autorizzazione ANGA Cat.4', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Autorizzazione ANGA Cat.4')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento ANGA Cat.4', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Ricevuta pagamento ANGA Cat.4')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Iscrizione RENTRI Cat.4', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Iscrizione RENTRI Cat.4')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento RENTRI Cat.4', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Ricevuta pagamento RENTRI Cat.4')
);

-- Cat.5
INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Autorizzazione ANGA Cat.5', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Autorizzazione ANGA Cat.5')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento ANGA Cat.5', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Ricevuta pagamento ANGA Cat.5')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Iscrizione RENTRI Cat.5', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Iscrizione RENTRI Cat.5')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento RENTRI Cat.5', 0, 0, 0, 0
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento WHERE LOWER(nome) = LOWER('Ricevuta pagamento RENTRI Cat.5')
);

-- Soft-disable duplicati ANGA/RENTRI generici (non Cat.x, non quietanza, non id 11-14)
-- Heuristica: stesso nome normalizzato, tiene l'id minore.
UPDATE tipi_documento td
INNER JOIN (
  SELECT
    LOWER(TRIM(REPLACE(REPLACE(nome, '  ', ' '), 'Autorizzazioni', 'Autorizzazione'))) AS nk,
    MIN(id) AS keep_id
  FROM tipi_documento
  WHERE (
      LOWER(nome) LIKE '%anga%'
      OR LOWER(nome) LIKE '%rentri%'
      OR LOWER(nome) LIKE '%rentry%'
    )
    AND LOWER(nome) NOT LIKE '%quietanz%'
    AND LOWER(nome) NOT LIKE '%cat.%'
  GROUP BY nk
  HAVING COUNT(*) > 1
) d ON LOWER(TRIM(REPLACE(REPLACE(td.nome, '  ', ' '), 'Autorizzazioni', 'Autorizzazione'))) = d.nk
SET td.mandatory = 0,
    td.from_preset = 0,
    td.flag_possesso = 0,
    td.nome = CONCAT('[DUP] ', td.nome)
WHERE td.id <> d.keep_id
  AND td.nome NOT LIKE '[DUP]%';

-- ---------------------------------------------------------------------------
-- 4) Verifica
-- ---------------------------------------------------------------------------
SELECT id, nome, mandatory, from_preset, flag_possesso
FROM tipi_documento
WHERE LOWER(nome) LIKE '%anga%'
   OR LOWER(nome) LIKE '%rentri%'
   OR LOWER(nome) LIKE '%rentry%'
ORDER BY id;

SHOW COLUMNS FROM subvettori_mezzi LIKE 'has_cat%';
SHOW COLUMNS FROM subvettori LIKE '%rappresentante%';
SHOW COLUMNS FROM subvettori LIKE 'num_iscrizione_albo';
SHOW COLUMNS FROM subvettori LIKE 'provincia_albo';
SHOW COLUMNS FROM subvettori LIKE 'iban';
SHOW COLUMNS FROM subvettori LIKE 'banca';
SHOW COLUMNS FROM subvettori LIKE 'codice_destinatario_sdi';
