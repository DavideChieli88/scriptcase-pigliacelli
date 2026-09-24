-- =============================================================================
-- migration_uat_tipi_documento_dati.sql
-- Allinea i DATI (e gli id) di tipi_documento e tipi_documento_alert
-- a DEV / Scriptcase (pigliacelli_2026-09-24).
--
-- File separato da migration_uat_align_struttura.sql.
-- Idempotente. Non tocca le altre tabelle, a parte lo spostamento di
-- documenti.tipo_documento_id se un tipo canonico esiste gia' con un id diverso.
--
-- Id tipi su DEV: 1-22, 30-39.
-- Id alert su DEV: 1-41, 64-71.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Righe gia' presenti: stesso id, nome e flag di DEV
-- -----------------------------------------------------------------------------

UPDATE `tipi_documento`
SET `tipo_collegato_id` = NULL
WHERE `id` = 8;

UPDATE `tipi_documento`
SET `nome` = 'Autorizzazione ANGA Cat.1',
    `mandatory` = 0, `from_preset` = 0, `is_readonly` = 0, `flag_possesso` = 0,
    `tipo_collegato_id` = NULL
WHERE `id` = 11;

UPDATE `tipi_documento`
SET `nome` = 'Ricevuta pagamento ANGA Cat.1',
    `mandatory` = 0, `from_preset` = 0, `is_readonly` = 0, `flag_possesso` = 0,
    `tipo_collegato_id` = NULL
WHERE `id` = 12;

UPDATE `tipi_documento`
SET `nome` = 'Iscrizione RENTRI',
    `mandatory` = 0, `from_preset` = 0, `is_readonly` = 0, `flag_possesso` = 0,
    `tipo_collegato_id` = NULL
WHERE `id` = 13;

UPDATE `tipi_documento`
SET `nome` = 'Ricevuta pagamento RENTRI',
    `mandatory` = 0, `from_preset` = 0, `is_readonly` = 0, `flag_possesso` = 0,
    `tipo_collegato_id` = NULL
WHERE `id` = 14;

UPDATE `tipi_documento`
SET `nome` = 'Patenti autisti (fronte/retro)',
    `mandatory` = 0, `from_preset` = 0, `is_readonly` = 0, `flag_possesso` = 0,
    `tipo_collegato_id` = NULL
WHERE `id` = 19;

-- -----------------------------------------------------------------------------
-- 2) Id 34-39 come su DEV. Se lo stesso nome esiste gia' con un altro id,
--    documenti e alert vengono spostati sull'id di DEV e la riga vecchia si elimina.
-- -----------------------------------------------------------------------------

INSERT INTO `tipi_documento`
    (`id`, `nome`, `mandatory`, `from_preset`, `is_readonly`, `flag_possesso`, `tipo_collegato_id`)
VALUES
    (34, 'Autorizzazione ANGA Cat.4', 0, 0, 0, 0, NULL),
    (35, 'Ricevuta pagamento ANGA Cat.4', 0, 0, 0, 0, NULL),
    (36, 'Autorizzazione ANGA Cat.5', 0, 0, 0, 0, NULL),
    (37, 'Ricevuta pagamento ANGA Cat.5', 0, 0, 0, 0, NULL),
    (38, 'CQC autisti (fronte/retro)', 0, 0, 0, 0, NULL),
    (39, 'DURF (scadenza quadriennale)', 1, 1, 0, 0, NULL)
ON DUPLICATE KEY UPDATE
    `nome` = VALUES(`nome`),
    `mandatory` = VALUES(`mandatory`),
    `from_preset` = VALUES(`from_preset`),
    `is_readonly` = VALUES(`is_readonly`),
    `flag_possesso` = VALUES(`flag_possesso`),
    `tipo_collegato_id` = VALUES(`tipo_collegato_id`);

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 34
WHERE src.`nome` = 'Autorizzazione ANGA Cat.4' AND src.`id` <> 34;

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 35
WHERE src.`nome` = 'Ricevuta pagamento ANGA Cat.4' AND src.`id` <> 35;

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 36
WHERE src.`nome` = 'Autorizzazione ANGA Cat.5' AND src.`id` <> 36;

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 37
WHERE src.`nome` = 'Ricevuta pagamento ANGA Cat.5' AND src.`id` <> 37;

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 38
WHERE src.`nome` = 'CQC autisti (fronte/retro)' AND src.`id` <> 38;

UPDATE `documenti` d
INNER JOIN `tipi_documento` src ON src.`id` = d.`tipo_documento_id`
SET d.`tipo_documento_id` = 39
WHERE src.`nome` = 'DURF (scadenza quadriennale)' AND src.`id` <> 39;

UPDATE `tipi_documento_alert` a
INNER JOIN `tipi_documento` src ON src.`id` = a.`tipo_documento_id`
SET a.`tipo_documento_id` = 34
WHERE src.`nome` = 'Autorizzazione ANGA Cat.4' AND src.`id` <> 34;

UPDATE `tipi_documento_alert` a
INNER JOIN `tipi_documento` src ON src.`id` = a.`tipo_documento_id`
SET a.`tipo_documento_id` = 35
WHERE src.`nome` = 'Ricevuta pagamento ANGA Cat.4' AND src.`id` <> 35;

UPDATE `tipi_documento_alert` a
INNER JOIN `tipi_documento` src ON src.`id` = a.`tipo_documento_id`
SET a.`tipo_documento_id` = 36
WHERE src.`nome` = 'Autorizzazione ANGA Cat.5' AND src.`id` <> 36;

UPDATE `tipi_documento_alert` a
INNER JOIN `tipi_documento` src ON src.`id` = a.`tipo_documento_id`
SET a.`tipo_documento_id` = 37
WHERE src.`nome` = 'Ricevuta pagamento ANGA Cat.5' AND src.`id` <> 37;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'Autorizzazione ANGA Cat.4' AND src.`id` <> 34
SET dst.`tipo_collegato_id` = 34
WHERE dst.`tipo_collegato_id` = src.`id`;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'Ricevuta pagamento ANGA Cat.4' AND src.`id` <> 35
SET dst.`tipo_collegato_id` = 35
WHERE dst.`tipo_collegato_id` = src.`id`;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'Autorizzazione ANGA Cat.5' AND src.`id` <> 36
SET dst.`tipo_collegato_id` = 36
WHERE dst.`tipo_collegato_id` = src.`id`;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'Ricevuta pagamento ANGA Cat.5' AND src.`id` <> 37
SET dst.`tipo_collegato_id` = 37
WHERE dst.`tipo_collegato_id` = src.`id`;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'CQC autisti (fronte/retro)' AND src.`id` <> 38
SET dst.`tipo_collegato_id` = 38
WHERE dst.`tipo_collegato_id` = src.`id`;

UPDATE `tipi_documento` dst
INNER JOIN `tipi_documento` src
    ON src.`nome` = 'DURF (scadenza quadriennale)' AND src.`id` <> 39
SET dst.`tipo_collegato_id` = 39
WHERE dst.`tipo_collegato_id` = src.`id`;

DELETE FROM `tipi_documento`
WHERE `id` <> 34 AND `nome` = 'Autorizzazione ANGA Cat.4';

DELETE FROM `tipi_documento`
WHERE `id` <> 35 AND `nome` = 'Ricevuta pagamento ANGA Cat.4';

DELETE FROM `tipi_documento`
WHERE `id` <> 36 AND `nome` = 'Autorizzazione ANGA Cat.5';

DELETE FROM `tipi_documento`
WHERE `id` <> 37 AND `nome` = 'Ricevuta pagamento ANGA Cat.5';

DELETE FROM `tipi_documento`
WHERE `id` <> 38 AND `nome` = 'CQC autisti (fronte/retro)';

DELETE FROM `tipi_documento`
WHERE `id` <> 39 AND `nome` = 'DURF (scadenza quadriennale)';

-- -----------------------------------------------------------------------------
-- 3) Alert: restano solo gli id di DEV.
--    1-41 sono gia' uguali. 42 e 43 (quietanza 23) e qualunque id intermedio si eliminano.
-- -----------------------------------------------------------------------------

DELETE FROM `tipi_documento_alert`
WHERE `id` NOT IN (
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
    64, 65, 66, 67, 68, 69, 70, 71
);

INSERT INTO `tipi_documento_alert`
    (`id`, `tipo_documento_id`, `rule_type`, `days_before`, `fixed_md`, `dest_scope`, `active`, `note`)
VALUES
    (64, 34, 'days_before', 30, NULL, 'sub',  1, '30 gg prima'),
    (65, 34, 'days_before', 0,  NULL, 'both', 1, 'giorno scadenza'),
    (66, 35, 'days_before', 14, NULL, 'sub',  1, '14 gg prima'),
    (67, 35, 'days_before', 0,  NULL, 'both', 1, 'giorno scadenza'),
    (68, 36, 'days_before', 30, NULL, 'sub',  1, '30 gg prima'),
    (69, 36, 'days_before', 0,  NULL, 'both', 1, 'giorno scadenza'),
    (70, 37, 'days_before', 14, NULL, 'sub',  1, '14 gg prima'),
    (71, 37, 'days_before', 0,  NULL, 'both', 1, 'giorno scadenza')
ON DUPLICATE KEY UPDATE
    `tipo_documento_id` = VALUES(`tipo_documento_id`),
    `rule_type` = VALUES(`rule_type`),
    `days_before` = VALUES(`days_before`),
    `fixed_md` = VALUES(`fixed_md`),
    `dest_scope` = VALUES(`dest_scope`),
    `active` = VALUES(`active`),
    `note` = VALUES(`note`);

-- -----------------------------------------------------------------------------
-- 4) Tipi presenti solo su UAT (23, 28, 29). Si eliminano se nessun documento li usa.
-- -----------------------------------------------------------------------------

DELETE td FROM `tipi_documento` td
WHERE td.`id` IN (23, 28, 29)
  AND NOT EXISTS (
      SELECT 1 FROM `documenti` d WHERE d.`tipo_documento_id` = td.`id`
  );

ALTER TABLE `tipi_documento` AUTO_INCREMENT = 40;
ALTER TABLE `tipi_documento_alert` AUTO_INCREMENT = 79;
