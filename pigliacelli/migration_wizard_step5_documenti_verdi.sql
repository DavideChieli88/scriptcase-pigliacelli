-- Wizard step 5: documenti verdi (tipi_documento.is_readonly=1) + EasyGN
-- DB: pigliacelli
-- Se una colonna/indice esiste già, saltare lo statement relativo.

-- 1) Colonne EasyGN / firma su documenti
ALTER TABLE `documenti`
    ADD COLUMN `easygn_workflow_id` VARCHAR(128) NULL DEFAULT NULL
        COMMENT 'EasyGN workflow id' AFTER `in_possesso`;

ALTER TABLE `documenti`
    ADD COLUMN `easygn_file_id` VARCHAR(128) NULL DEFAULT NULL
        AFTER `easygn_workflow_id`;

ALTER TABLE `documenti`
    ADD COLUMN `easygn_sign_link` TEXT NULL
        AFTER `easygn_file_id`;

ALTER TABLE `documenti`
    ADD COLUMN `easygn_signer_ids` TEXT NULL
        AFTER `easygn_sign_link`;

ALTER TABLE `documenti`
    ADD COLUMN `firmato_il` DATETIME NULL DEFAULT NULL
        AFTER `easygn_signer_ids`;

ALTER TABLE `documenti`
    ADD INDEX `idx_documenti_easygn_wf` (`easygn_workflow_id`);

-- 2) Commento wizard_step
ALTER TABLE `subvettori`
    MODIFY COLUMN `wizard_step` TINYINT UNSIGNED NOT NULL DEFAULT 1
    COMMENT '1=anagrafica 2=autisti 3=mezzi 4=documenti upload 5=firma verdi 0=completato';

-- 3) Tipi verdi: bootstrap + readonly
UPDATE `tipi_documento`
SET `from_preset` = 1
WHERE COALESCE(`is_readonly`, 0) = 1
  AND COALESCE(`from_preset`, 0) <> 1;

-- 3b) Dichiarazioni: readonly + preset (ReportPDF, non solo placeholder)
UPDATE `tipi_documento`
SET `is_readonly` = 1, `from_preset` = 1
WHERE LOWER(nome) LIKE '%dichiaraz%'
  AND (
        COALESCE(`is_readonly`, 0) = 0
     OR COALESCE(`from_preset`, 0) = 0
  );


-- 4) Setting path placeholder (opzionale)
INSERT INTO `sec_settings` (`set_name`, `set_value`)
SELECT 'documento_verde_placeholder', 'placeholder_documento_verde.pdf'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM `sec_settings` WHERE `set_name` = 'documento_verde_placeholder' LIMIT 1
);

-- Deploy: copiare placeholder_documento_verde.pdf in templates_path o _lib/file/doc/
