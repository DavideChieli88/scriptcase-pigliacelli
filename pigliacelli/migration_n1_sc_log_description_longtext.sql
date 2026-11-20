-- ============================================================
-- Fix: salvataggio form_contratti_template fallisce con
--   Data too long for column 'description' at row 1
-- perché ScriptCase Log scrive old/new di html_body in sc_log.
--
-- CHECK:
--   SHOW COLUMNS FROM sc_log LIKE 'description';
-- ============================================================

ALTER TABLE `sc_log`
  MODIFY COLUMN `description` LONGTEXT NULL;
