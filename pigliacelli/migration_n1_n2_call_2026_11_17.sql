-- ============================================================
-- Pigliacelli — migration NEW call 17/11/2026 (N2 + N1)
-- DB: pigliacelli
--
-- N2: documenti inviati da Pigliacelli (visione | firma)
-- N1: template contratto HTML (tipo 1) + snapshot per invio
--
-- NON applicare alla cieca. Eseguire prima i CHECK sotto e
-- commentare gli ALTER delle colonne già presenti.
-- ============================================================

-- ---------- CHECK pre-apply (solo SELECT) ----------
-- SHOW COLUMNS FROM documenti LIKE 'presa_visione_at';
-- SHOW COLUMNS FROM documenti LIKE 'origine';
-- SHOW COLUMNS FROM documenti LIKE 'titolo';
-- SHOW COLUMNS FROM documenti LIKE 'modalita';
-- SHOW COLUMNS FROM documenti LIKE 'sign_boxes_json';
-- SHOW COLUMNS FROM documenti LIKE 'inviato_da_login';
-- SHOW COLUMNS FROM documenti LIKE 'inviato_at';
-- SHOW COLUMNS FROM documenti LIKE 'easygn_workflow_id';
-- SHOW COLUMNS FROM documenti LIKE 'firmato_il';
-- SHOW COLUMNS FROM contratti LIKE 'template_id';
-- SHOW COLUMNS FROM contratti LIKE 'html_body_snapshot';
-- SHOW COLUMNS FROM contratti LIKE 'sign_boxes_json';
-- SHOW TABLES LIKE 'contratti_template';

-- ---------- N2: documenti PGL ----------
-- Nota: presa_visione_at e colonne easygn_* / firmato_il
--       risultano già usate dal wizard (step 6). Non ricrearle.

ALTER TABLE `documenti`
  ADD COLUMN `origine` ENUM('subv','pgl') NOT NULL DEFAULT 'subv'
    COMMENT 'subv=caricato dal subvettore; pgl=inviato da Pigliacelli'
    AFTER `subvettore_id`;

ALTER TABLE `documenti`
  ADD COLUMN `titolo` VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Titolo libero per invii PGL (N2); NULL sui doc da tipi_documento'
    AFTER `origine`;

ALTER TABLE `documenti`
  ADD COLUMN `modalita` ENUM('upload','visione','firma') NOT NULL DEFAULT 'upload'
    COMMENT 'upload=flusso storico subv; visione|firma=invio PGL'
    AFTER `titolo`;

ALTER TABLE `documenti`
  ADD COLUMN `sign_boxes_json` LONGTEXT NULL
    COMMENT 'JSON EGN_SIGN-compatible: {"version":1,"visuals":{...}} in mm'
    AFTER `modalita`;

ALTER TABLE `documenti`
  ADD COLUMN `inviato_da_login` VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Login operatore che ha inviato il doc PGL'
    AFTER `sign_boxes_json`;

ALTER TABLE `documenti`
  ADD COLUMN `inviato_at` DATETIME NULL DEFAULT NULL
    COMMENT 'Timestamp invio al subvettore'
    AFTER `inviato_da_login`;

-- Solo se manca (wizard Manuale / N2 visione). Su UAT di solito ESISTE già:
-- ALTER TABLE `documenti`
--   ADD COLUMN `presa_visione_at` DATETIME NULL DEFAULT NULL
--     COMMENT 'Timestamp presa visione (Manuale / N2 visione)'
--     AFTER `inviato_at`;

ALTER TABLE `documenti`
  ADD INDEX `idx_documenti_origine_sub` (`origine`, `subvettore_id`);

ALTER TABLE `documenti`
  ADD INDEX `idx_documenti_modalita` (`modalita`);

-- DEFAULT sulle nuove colonne = già 'subv' / 'upload' per lo storico.
-- Nessun UPDATE di backfill necessario dopo ADD COLUMN ... DEFAULT.

-- ---------- N1: template contratto HTML ----------

CREATE TABLE IF NOT EXISTS `contratti_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(150) NOT NULL,
  `html_body` LONGTEXT NOT NULL
    COMMENT 'Corpo HTML editabile (placeholder {{campo}})',
  `attivo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contratti_template_attivo` (`attivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Template master contratto tipo 1 (N1 call 17/11)';

ALTER TABLE `contratti`
  ADD COLUMN `template_id` INT UNSIGNED NULL DEFAULT NULL
    COMMENT 'FK logica a contratti_template.id usato come base'
    AFTER `tipo_contratto_id`;

ALTER TABLE `contratti`
  ADD COLUMN `html_body_snapshot` LONGTEXT NULL
    COMMENT 'HTML fillato/editato per questo contratto (pre-invio)'
    AFTER `template_id`;

ALTER TABLE `contratti`
  ADD COLUMN `sign_boxes_json` LONGTEXT NULL
    COMMENT 'Box firma per questo PDF (stesso schema EGN_SIGN)'
    AFTER `html_body_snapshot`;

-- Seed template: dopo export HTML da nuovo_contratto_vettore
-- INSERT INTO `contratti_template` (`nome`, `html_body`, `attivo`)
-- VALUES ('Contratto standard', '...', 1);
