-- ============================================================
-- Pigliacelli — N1 step 2: scelta template sul contratto tipo 1
-- Prerequisito: migration_n1_contratti_template_min.sql
--
-- CHECK prima:
--   SHOW COLUMNS FROM contratti LIKE 'template_id';
--   SHOW COLUMNS FROM contratti LIKE 'html_body_snapshot';
--   SHOW COLUMNS FROM contratti_template LIKE 'is_default';
-- ============================================================

-- Default template (uno "standard" pre-selezionato in UI)
ALTER TABLE `contratti_template`
  ADD COLUMN `is_default` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = pre-selezionato in nuovo contratto quadro'
    AFTER `attivo`;

-- Solo un default attivo alla volta (best-effort)
UPDATE `contratti_template`
SET `is_default` = 1
WHERE `nome` = 'Contratto quadro standard'
  AND `id` = (
    SELECT id FROM (
      SELECT MIN(id) AS id FROM `contratti_template`
      WHERE `nome` = 'Contratto quadro standard'
    ) t
  );

ALTER TABLE `contratti`
  ADD COLUMN `template_id` INT UNSIGNED NULL DEFAULT NULL
    COMMENT 'FK logica a contratti_template.id'
    AFTER `tipo_contratto_id`;

ALTER TABLE `contratti`
  ADD COLUMN `html_body_snapshot` LONGTEXT NULL
    COMMENT 'Copia HTML del template (editabile pre-invio senza toccare il master)'
    AFTER `template_id`;

ALTER TABLE `contratti`
  ADD INDEX `idx_contratti_template_id` (`template_id`);
