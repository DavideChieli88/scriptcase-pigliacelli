-- =============================================================================
-- migration_documenti_alert_scadenze.sql
-- Sistema alert scadenze documenti (solo config).
-- NON modifica send_expired_doc_alert (job legacy resta attivo finché non
-- si spegne lo schedule).
--
-- Match job: days_before = N → delta == N; days_before = 0 → delta == 0.
-- Duplicati: evitare in UI / seed (NOT EXISTS). Nessuna rule_key.
--
-- Destinatari (decisione prodotto 2026-08):
--   days_before > 0  / fixed pre-scadenza → solo subvettore (dest_scope = sub)
--   days_before = 0  / giorno scadenza     → subvettore + operatori (both)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `tipi_documento_alert` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `tipo_documento_id` INT(11) NOT NULL,
    `rule_type` ENUM('days_before', 'fixed_md') NOT NULL DEFAULT 'days_before',
    `days_before` INT(11) NULL DEFAULT NULL,
    `fixed_md` CHAR(5) NULL DEFAULT NULL,
    `dest_scope` ENUM('sub', 'ops', 'both') NOT NULL DEFAULT 'sub',
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_tda_tipo` (`tipo_documento_id`),
    KEY `idx_tda_active` (`active`),
    CONSTRAINT `tipi_documento_alert_tipo_fk`
        FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipi_documento` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Seed (docs_elenco_documenti_subvettori.md). Idempotente via NOT EXISTS.
-- Solo tipi che esistono in tipi_documento (evita errore FK).
-- -----------------------------------------------------------------------------

INSERT INTO tipi_documento_alert
    (tipo_documento_id, rule_type, days_before, fixed_md, dest_scope, note)
SELECT s.tipo_documento_id, s.rule_type, s.days_before, s.fixed_md, s.dest_scope, s.note
FROM (
    -- 1 Legale rappresentante
    SELECT 1 AS tipo_documento_id, 'days_before' AS rule_type, 14 AS days_before, NULL AS fixed_md, 'sub' AS dest_scope, '14 gg prima' AS note
    UNION ALL SELECT 1, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 3 DURC
    UNION ALL SELECT 3, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 3, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 5 Albo conto terzi (date fisse)
    UNION ALL SELECT 5, 'fixed_md', NULL, '12-15', 'sub', '15 dicembre'
    UNION ALL SELECT 5, 'fixed_md', NULL, '01-15', 'sub', '15 gennaio'
    UNION ALL SELECT 5, 'fixed_md', NULL, '01-31', 'both', '31 gennaio scadenza'
    -- 6 Visura
    UNION ALL SELECT 6, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 6, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 7 Elenco automezzi
    UNION ALL SELECT 7, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 7, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 8 Polizza vettoriale
    UNION ALL SELECT 8, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 8, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 9 White list
    UNION ALL SELECT 9, 'days_before', 60, NULL, 'sub', '60 gg prima'
    UNION ALL SELECT 9, 'days_before', 45, NULL, 'sub', '45 gg prima'
    UNION ALL SELECT 9, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 9, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 10 Dichiarazioni
    UNION ALL SELECT 10, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 10, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 11 ANGA auth
    UNION ALL SELECT 11, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 11, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 12 Ricevuta ANGA
    UNION ALL SELECT 12, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 12, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 14 Ricevuta RENTRI
    UNION ALL SELECT 14, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 14, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 15 Polizza RCT/RCO
    UNION ALL SELECT 15, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 15, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 16 Polizza RCA
    UNION ALL SELECT 16, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 16, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 17 Elenco autisti
    UNION ALL SELECT 17, 'days_before', 7, NULL, 'sub', '7 gg prima'
    UNION ALL SELECT 17, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 18–23 autisti/mezzi
    UNION ALL SELECT 18, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 18, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    UNION ALL SELECT 19, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 19, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    UNION ALL SELECT 20, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 20, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    UNION ALL SELECT 21, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 21, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    UNION ALL SELECT 22, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 22, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    UNION ALL SELECT 23, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 23, 'days_before', 0, NULL, 'both', 'giorno scadenza'
) AS s
INNER JOIN tipi_documento td ON td.id = s.tipo_documento_id
WHERE NOT EXISTS (
    SELECT 1
    FROM tipi_documento_alert a
    WHERE a.tipo_documento_id = s.tipo_documento_id
      AND a.rule_type = s.rule_type
      AND (
          (s.rule_type = 'days_before' AND a.days_before <=> s.days_before)
          OR (s.rule_type = 'fixed_md' AND a.fixed_md <=> s.fixed_md)
      )
);

-- Verifica
SELECT id, tipo_documento_id, rule_type, days_before, fixed_md, dest_scope, note
FROM tipi_documento_alert
ORDER BY tipo_documento_id, rule_type, days_before DESC, fixed_md;
