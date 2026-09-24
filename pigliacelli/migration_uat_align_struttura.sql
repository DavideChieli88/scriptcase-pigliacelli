-- =============================================================================
-- migration_uat_align_struttura.sql
-- Allinea la STRUTTURA di UAT (workspace_uat_240926_pre_import_new_tables.sql)
-- a DEV / Scriptcase (pigliacelli_2026-09-24_14-02-38.sql).
--
-- Solo le tabelle presenti su DEV. Le tabelle del modulo 1
-- (societa, fornitori, ddt_acquisti, ordini_dettagli, ...) non sono su DEV
-- e non vengono create.
--
-- Non modifica dati. Idempotente.
-- MariaDB 10.11. Eseguire sul database di UAT.
-- =============================================================================

DROP PROCEDURE IF EXISTS uat_add_column;
DROP PROCEDURE IF EXISTS uat_drop_fk;
DROP PROCEDURE IF EXISTS uat_drop_index;

DELIMITER $$

CREATE PROCEDURE uat_add_column(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND COLUMN_NAME = p_column
    ) THEN
        SET @uat_sql = CONCAT(
            'ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_def
        );
        PREPARE uat_stmt FROM @uat_sql;
        EXECUTE uat_stmt;
        DEALLOCATE PREPARE uat_stmt;
    END IF;
END$$

CREATE PROCEDURE uat_drop_fk(
    IN p_table VARCHAR(64),
    IN p_constraint VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND CONSTRAINT_NAME = p_constraint
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        SET @uat_sql = CONCAT(
            'ALTER TABLE `', p_table, '` DROP FOREIGN KEY `', p_constraint, '`'
        );
        PREPARE uat_stmt FROM @uat_sql;
        EXECUTE uat_stmt;
        DEALLOCATE PREPARE uat_stmt;
    END IF;
END$$

CREATE PROCEDURE uat_drop_index(
    IN p_table VARCHAR(64),
    IN p_index VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND INDEX_NAME = p_index
    ) THEN
        SET @uat_sql = CONCAT(
            'ALTER TABLE `', p_table, '` DROP INDEX `', p_index, '`'
        );
        PREPARE uat_stmt FROM @uat_sql;
        EXECUTE uat_stmt;
        DEALLOCATE PREPARE uat_stmt;
    END IF;
END$$

DELIMITER ;

-- =============================================================================
-- 1) Tabella presente solo su DEV
-- =============================================================================

CREATE TABLE IF NOT EXISTS `subvettori_dichiarazioni` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `subvettore_id` int(10) unsigned NOT NULL,
    `anno` smallint(5) unsigned NOT NULL,
    `stato` varchar(16) NOT NULL DEFAULT 'bozza' COMMENT 'bozza | compilata | firmata',
    `documento_id` int(10) unsigned DEFAULT NULL COMMENT 'documenti.id del PDF generato per questo anno',
    `capitale_sociale` decimal(14,2) DEFAULT NULL,
    `capitale_iv` tinyint(1) DEFAULT NULL COMMENT 'interamente versato',
    `anno_inizio_attivita` smallint(5) unsigned DEFAULT NULL,
    `sede_amministrativa` varchar(255) DEFAULT NULL,
    `fax` varchar(32) DEFAULT NULL,
    `ren` varchar(64) DEFAULT NULL,
    `num_albo_gestori` varchar(64) DEFAULT NULL,
    `anga_cat1` tinyint(1) NOT NULL DEFAULT 0,
    `anga_cat1_data` date DEFAULT NULL,
    `anga_cat4` tinyint(1) NOT NULL DEFAULT 0,
    `anga_cat4_data` date DEFAULT NULL,
    `anga_cat5` tinyint(1) NOT NULL DEFAULT 0,
    `anga_cat5_data` date DEFAULT NULL,
    `attivita_svolta` text DEFAULT NULL,
    `resp_contabilita` varchar(255) DEFAULT NULL,
    `resp_contabilita_tel` varchar(32) DEFAULT NULL,
    `resp_contabilita_cell` varchar(32) DEFAULT NULL,
    `resp_commerciale` varchar(255) DEFAULT NULL,
    `resp_commerciale_tel` varchar(32) DEFAULT NULL,
    `resp_commerciale_cell` varchar(32) DEFAULT NULL,
    `resp_logistica` varchar(255) DEFAULT NULL,
    `resp_logistica_tel` varchar(32) DEFAULT NULL,
    `resp_logistica_cell` varchar(32) DEFAULT NULL,
    `resp_amministrativo` varchar(255) DEFAULT NULL,
    `mercato_nazionale` tinyint(1) NOT NULL DEFAULT 0,
    `mercato_internazionale` tinyint(1) NOT NULL DEFAULT 0,
    `nazioni` varchar(255) DEFAULT NULL,
    `n_personale` int(10) unsigned DEFAULT NULL,
    `n_dirigenti` int(10) unsigned DEFAULT NULL,
    `n_impiegati` int(10) unsigned DEFAULT NULL,
    `n_operai` int(10) unsigned DEFAULT NULL,
    `fatturato_anno_1` smallint(5) unsigned DEFAULT NULL,
    `fatturato_importo_1` decimal(14,2) DEFAULT NULL,
    `fatturato_anno_2` smallint(5) unsigned DEFAULT NULL,
    `fatturato_importo_2` decimal(14,2) DEFAULT NULL,
    `fatturato_anno_3` smallint(5) unsigned DEFAULT NULL,
    `fatturato_importo_3` decimal(14,2) DEFAULT NULL,
    `cliente_1` varchar(255) DEFAULT NULL,
    `prodotto_1` varchar(255) DEFAULT NULL,
    `perc_fatturato_1` decimal(5,2) DEFAULT NULL,
    `cliente_2` varchar(255) DEFAULT NULL,
    `prodotto_2` varchar(255) DEFAULT NULL,
    `perc_fatturato_2` decimal(5,2) DEFAULT NULL,
    `cliente_3` varchar(255) DEFAULT NULL,
    `prodotto_3` varchar(255) DEFAULT NULL,
    `perc_fatturato_3` decimal(5,2) DEFAULT NULL,
    `massimale_vettoriale` decimal(14,2) DEFAULT NULL,
    `massimale_rc_auto` decimal(14,2) DEFAULT NULL,
    `massimale_rct_rco` decimal(14,2) DEFAULT NULL,
    `resp_qualita` varchar(255) DEFAULT NULL,
    `resp_qualita_tel` varchar(32) DEFAULT NULL,
    `resp_ambientale` varchar(255) DEFAULT NULL,
    `resp_ambientale_tel` varchar(32) DEFAULT NULL,
    `dl_nome` varchar(255) DEFAULT NULL,
    `dl_tel` varchar(32) DEFAULT NULL,
    `rspp_nome` varchar(255) DEFAULT NULL,
    `rspp_tel` varchar(32) DEFAULT NULL,
    `resp_haccp` varchar(255) DEFAULT NULL,
    `resp_haccp_tel` varchar(32) DEFAULT NULL,
    `q_5_1_iso9001` tinyint(1) DEFAULT NULL,
    `q_5_2_piano_iso9001` tinyint(1) DEFAULT NULL,
    `q_5_3_politica_qualita` tinyint(1) DEFAULT NULL,
    `q_5_4_resp_qualita` tinyint(1) DEFAULT NULL,
    `q_5_5_responsabilita` tinyint(1) DEFAULT NULL,
    `q_5_6_audit_interni` tinyint(1) DEFAULT NULL,
    `q_5_7_riunione_coord` tinyint(1) DEFAULT NULL,
    `q_5_8_procedure_generali` tinyint(1) DEFAULT NULL,
    `q_5_9_rimorchi_cassonati` tinyint(1) DEFAULT NULL,
    `q_5_10_rimorchi_vasche` tinyint(1) DEFAULT NULL,
    `q_5_11_rimorchi_centinati` tinyint(1) DEFAULT NULL,
    `q_5_12_rimorchi_silos` tinyint(1) DEFAULT NULL,
    `q_5_13_manichette_silos` tinyint(1) DEFAULT NULL,
    `q_5_14_manutenzione_mezzi` tinyint(1) DEFAULT NULL,
    `q_5_15_no_subvezione_terzi` tinyint(1) DEFAULT NULL,
    `q_6_1_resp_acquisti` tinyint(1) DEFAULT NULL,
    `q_6_2_procedure_acquisti` tinyint(1) DEFAULT NULL,
    `q_6_3_conformita_acquisti` tinyint(1) DEFAULT NULL,
    `q_6_4a_selezione_fornitori` tinyint(1) DEFAULT NULL,
    `q_6_4b_sorveglianza_forniture` tinyint(1) DEFAULT NULL,
    `q_6_4c_ispezione_ricevimento` tinyint(1) DEFAULT NULL,
    `q_6_5_elenco_fornitori` tinyint(1) DEFAULT NULL,
    `q_6_6_certificati_fornitori` tinyint(1) DEFAULT NULL,
    `q_7_1_iso14001` tinyint(1) DEFAULT NULL,
    `q_7_2_piano_iso14001` tinyint(1) DEFAULT NULL,
    `q_7_3_politica_ambiente` tinyint(1) DEFAULT NULL,
    `q_7_4_resp_ambientale` tinyint(1) DEFAULT NULL,
    `q_7_5_analisi_ambientale` tinyint(1) DEFAULT NULL,
    `q_7_6_formazione_rifiuti` tinyint(1) DEFAULT NULL,
    `q_7_7_kit_antisversamento` tinyint(1) DEFAULT NULL,
    `q_7_8_pronto_intervento` tinyint(1) DEFAULT NULL,
    `q_7_9_verifica_trasporti` tinyint(1) DEFAULT NULL,
    `q_7_10_mezzi_autorizzati_anga` tinyint(1) DEFAULT NULL,
    `q_7_11_quantitativi_anga` tinyint(1) DEFAULT NULL,
    `q_7_12_mud_152` tinyint(1) DEFAULT NULL,
    `q_8_1_iso45001` tinyint(1) DEFAULT NULL,
    `q_8_2_piano_iso45001` tinyint(1) DEFAULT NULL,
    `q_8_3_politica_sicurezza` tinyint(1) DEFAULT NULL,
    `q_8_4_dl_rspp` tinyint(1) DEFAULT NULL,
    `q_8_5_infortuni` tinyint(1) DEFAULT NULL,
    `q_8_6_verbali_autisti` tinyint(1) DEFAULT NULL,
    `q_8_7_dvr_dpi` tinyint(1) DEFAULT NULL,
    `q_8_8_schede_dpi` tinyint(1) DEFAULT NULL,
    `q_8_9_attestato_mansione` tinyint(1) DEFAULT NULL,
    `q_8_10_dpi_iii_categoria` tinyint(1) DEFAULT NULL,
    `q_8_11_norme_siti` tinyint(1) DEFAULT NULL,
    `q_8_12_protocollo_sanitario` tinyint(1) DEFAULT NULL,
    `q_9_1_sqas` tinyint(1) DEFAULT NULL,
    `q_9_2_diagnosi_energetica` tinyint(1) DEFAULT NULL,
    `q_10_1_gmp` tinyint(1) DEFAULT NULL,
    `q_10_2_sicurezza_alimentare` tinyint(1) DEFAULT NULL,
    `q_10_3_politica_alimentare` tinyint(1) DEFAULT NULL,
    `q_10_4_resp_alimentare` tinyint(1) DEFAULT NULL,
    `q_10_5_scia_asl` tinyint(1) DEFAULT NULL,
    `q_10_6_tracciabilita` tinyint(1) DEFAULT NULL,
    `q_10_7_audit_tracciabilita` tinyint(1) DEFAULT NULL,
    `q_10_8_pcc_poa` tinyint(1) DEFAULT NULL,
    `q_10_9_manuale_autocontrollo` tinyint(1) DEFAULT NULL,
    `q_10_10_haccp_autisti` tinyint(1) DEFAULT NULL,
    `q_10_11_mezzi_alimentari` tinyint(1) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_subvettore_anno` (`subvettore_id`,`anno`),
    KEY `idx_dichiarazioni_documento` (`documento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =============================================================================
-- 2) subvettori: anagrafica dichiarazioni
-- =============================================================================

CALL uat_add_column('subvettori', 'num_iscrizione_albo', 'VARCHAR(64) DEFAULT NULL AFTER `pec`');
CALL uat_add_column('subvettori', 'provincia_albo', 'VARCHAR(16) DEFAULT NULL AFTER `num_iscrizione_albo`');
CALL uat_add_column('subvettori', 'banca', 'VARCHAR(255) DEFAULT NULL AFTER `provincia_albo`');
CALL uat_add_column('subvettori', 'iban', 'VARCHAR(64) DEFAULT NULL AFTER `banca`');
CALL uat_add_column('subvettori', 'codice_destinatario_sdi', 'VARCHAR(16) DEFAULT NULL AFTER `iban`');
CALL uat_add_column('subvettori', 'cod_fiscale_rappresentante', 'VARCHAR(32) DEFAULT NULL AFTER `data_nascita_rappresentante`');
CALL uat_add_column('subvettori', 'residenza_citta_rappresentante', 'VARCHAR(255) DEFAULT NULL AFTER `cod_fiscale_rappresentante`');
CALL uat_add_column('subvettori', 'residenza_prov_rappresentante', 'VARCHAR(16) DEFAULT NULL AFTER `residenza_citta_rappresentante`');
CALL uat_add_column('subvettori', 'residenza_indirizzo_rappresentante', 'VARCHAR(255) DEFAULT NULL AFTER `residenza_prov_rappresentante`');
CALL uat_add_column('subvettori', 'residenza_civico_rappresentante', 'VARCHAR(32) DEFAULT NULL AFTER `residenza_indirizzo_rappresentante`');

-- =============================================================================
-- 3) subvettori_autisti: scadenze documenti
-- =============================================================================

CALL uat_add_column('subvettori_autisti', 'scadenza_idoneita_sanitaria', 'DATE DEFAULT NULL AFTER `scadenza_cqc`');
CALL uat_add_column('subvettori_autisti', 'scadenza_formazione_sicurezza', 'DATE DEFAULT NULL AFTER `scadenza_idoneita_sanitaria`');
CALL uat_add_column('subvettori_autisti', 'scadenza_dpi_iii_categoria', 'DATE DEFAULT NULL AFTER `scadenza_formazione_sicurezza`');
CALL uat_add_column('subvettori_autisti', 'scadenza_permesso_soggiorno', 'DATE DEFAULT NULL AFTER `scadenza_dpi_iii_categoria`');

-- =============================================================================
-- 4) subvettori_mezzi: categorie ANGA
--    Su entrambi i db le stesse colonne restano anche su subvettori_autisti.
-- =============================================================================

CALL uat_add_column('subvettori_mezzi', 'has_cat_trasp_rifiuti_1', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `scadenza_assicurazioni`');
CALL uat_add_column('subvettori_mezzi', 'has_cat_trasp_rifiuti_4', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_cat_trasp_rifiuti_1`');
CALL uat_add_column('subvettori_mezzi', 'has_cat_trasp_rifiuti_5', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `has_cat_trasp_rifiuti_4`');

-- =============================================================================
-- 5) tipi_documento: su UAT c'e' una FK assente su DEV. La colonna resta.
-- =============================================================================

CALL uat_drop_fk('tipi_documento', 'tipo_documento_tipo_documento_fk');
CALL uat_drop_index('tipi_documento', 'tipo_documento_tipo_documento_fk');

DROP PROCEDURE IF EXISTS uat_add_column;
DROP PROCEDURE IF EXISTS uat_drop_fk;
DROP PROCEDURE IF EXISTS uat_drop_index;
