-- =============================================================================
-- migration_tipi_anga_rentri_2026_09_17.sql
-- tipi_documento: ANGA / RENTRI allineati alla mail 17/09/2026
-- (docs/chiarimento_anga_rentri_2026-09-17.md). Idempotente, rieseguibile.
--
-- Stato di partenza (phpMyAdmin 17/09):
--   11 "Autorizzazioni ANGA – Cat. 1 + Cat. 4 + Cat. 5 (se…)"  from_preset=1 flag_possesso=1
--   12 "Ricevuta pagamento annuale ANGA (scadenza annuale …)"   from_preset=1 flag_possesso=1
--   13 "Iscrizione RENTRI"                                      from_preset=1
--   14 "Ricevuta pagamento RENTRI (scadenza annuale 30 apr…)"   from_preset=1 flag_possesso=1
--   → mancano Cat.4 e Cat.5 (Autorizzazione + Ricevuta ANGA)
--
-- Target (nomi = lookup esatti usati da form_subvettori_mezzi_on*):
--   11 Autorizzazione ANGA Cat.1        | nuovo Autorizzazione ANGA Cat.4    | nuovo Autorizzazione ANGA Cat.5
--   12 Ricevuta pagamento ANGA Cat.1    | nuovo Ricevuta pagamento ANGA Cat.4| nuovo Ricevuta pagamento ANGA Cat.5
--   13 Iscrizione RENTRI          (unico, nessuna scadenza)
--   14 Ricevuta pagamento RENTRI  (unico, scad. 30/04)
--
-- ANGA/RENTRI sono ora documenti del MEZZO (SAL 16/09): from_preset=0 (niente
-- precarico step 4 aziendale), flag_possesso=0 (il "possesso" è il radio has_cat_*).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Canonici 11–14: rinomina + non più aziendali
-- -----------------------------------------------------------------------------
UPDATE tipi_documento
SET nome = 'Autorizzazione ANGA Cat.1', mandatory = 0, from_preset = 0, is_readonly = 0, flag_possesso = 0
WHERE id = 11;

UPDATE tipi_documento
SET nome = 'Ricevuta pagamento ANGA Cat.1', mandatory = 0, from_preset = 0, is_readonly = 0, flag_possesso = 0
WHERE id = 12;

UPDATE tipi_documento
SET nome = 'Iscrizione RENTRI', mandatory = 0, from_preset = 0, is_readonly = 0, flag_possesso = 0
WHERE id = 13;

UPDATE tipi_documento
SET nome = 'Ricevuta pagamento RENTRI', mandatory = 0, from_preset = 0, is_readonly = 0, flag_possesso = 0
WHERE id = 14;

-- -----------------------------------------------------------------------------
-- 2) Nuovi tipi Cat.4 / Cat.5 (solo se mancanti)
-- -----------------------------------------------------------------------------
INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Autorizzazione ANGA Cat.4', 0, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Autorizzazione ANGA Cat.4'));

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento ANGA Cat.4', 0, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Ricevuta pagamento ANGA Cat.4'));

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Autorizzazione ANGA Cat.5', 0, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Autorizzazione ANGA Cat.5'));

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Ricevuta pagamento ANGA Cat.5', 0, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Ricevuta pagamento ANGA Cat.5'));

-- -----------------------------------------------------------------------------
-- 3) Alert scadenze per i nuovi tipi (stesse regole di 11 e 12).
--    Eseguito solo se esiste tipi_documento_alert (migration_documenti_alert_scadenze.sql).
--    Autorizzazione ANGA: 30 gg prima (sub) + giorno scadenza (both)
--    Ricevuta ANGA:       14 gg prima (sub) + giorno scadenza (both)
--    Iscrizione RENTRI (13): nessuna scadenza → nessun alert.
-- -----------------------------------------------------------------------------
SET @db := DATABASE();
SET @has_alert := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tipi_documento_alert'
);

SET @sql := IF(@has_alert > 0, '
INSERT INTO tipi_documento_alert (tipo_documento_id, rule_type, days_before, fixed_md, dest_scope, note)
SELECT td.id, s.rule_type, s.days_before, NULL, s.dest_scope, s.note
FROM (
        SELECT ''Autorizzazione ANGA Cat.4''     AS nome, ''days_before'' AS rule_type, 30 AS days_before, ''sub''  AS dest_scope, ''30 gg prima''     AS note
  UNION ALL SELECT ''Autorizzazione ANGA Cat.4'',     ''days_before'', 0,  ''both'', ''giorno scadenza''
  UNION ALL SELECT ''Autorizzazione ANGA Cat.5'',     ''days_before'', 30, ''sub'',  ''30 gg prima''
  UNION ALL SELECT ''Autorizzazione ANGA Cat.5'',     ''days_before'', 0,  ''both'', ''giorno scadenza''
  UNION ALL SELECT ''Ricevuta pagamento ANGA Cat.4'', ''days_before'', 14, ''sub'',  ''14 gg prima''
  UNION ALL SELECT ''Ricevuta pagamento ANGA Cat.4'', ''days_before'', 0,  ''both'', ''giorno scadenza''
  UNION ALL SELECT ''Ricevuta pagamento ANGA Cat.5'', ''days_before'', 14, ''sub'',  ''14 gg prima''
  UNION ALL SELECT ''Ricevuta pagamento ANGA Cat.5'', ''days_before'', 0,  ''both'', ''giorno scadenza''
) AS s
INNER JOIN tipi_documento td ON LOWER(TRIM(td.nome)) = LOWER(s.nome)
WHERE NOT EXISTS (
  SELECT 1 FROM tipi_documento_alert a
  WHERE a.tipo_documento_id = td.id
    AND a.rule_type = s.rule_type
    AND a.days_before <=> s.days_before
)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- -----------------------------------------------------------------------------
-- 4) Verifica: attesi 11, 12, 13, 14 + 4 nuove righe Cat.4/Cat.5, tutte from_preset=0 flag_possesso=0
-- -----------------------------------------------------------------------------
SELECT id, nome, mandatory, from_preset, is_readonly, flag_possesso, tipo_collegato_id
FROM tipi_documento
WHERE LOWER(nome) LIKE '%anga%' OR LOWER(nome) LIKE '%rentri%'
ORDER BY id;
