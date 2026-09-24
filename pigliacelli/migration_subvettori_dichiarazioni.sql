-- =============================================================================
-- migration_subvettori_dichiarazioni.sql
-- Dichiarazione annuale (Allegato E / F / massimali I).
-- Una riga per subvettore + anno. Anagrafica resta su subvettori.
-- Sì/no: 1 = sì, 0 = no, NULL = non risposto.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `subvettori_dichiarazioni` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subvettore_id` INT UNSIGNED NOT NULL,
  `anno` SMALLINT UNSIGNED NOT NULL,
  `stato` VARCHAR(16) NOT NULL DEFAULT 'bozza' COMMENT 'bozza | compilata | firmata',
  `documento_id` INT UNSIGNED NULL DEFAULT NULL COMMENT 'documenti.id del PDF generato per questo anno',

  -- Allegato E + testata F
  `capitale_sociale` DECIMAL(14,2) NULL DEFAULT NULL,
  `capitale_iv` TINYINT(1) NULL DEFAULT NULL COMMENT 'interamente versato',
  `anno_inizio_attivita` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `sede_amministrativa` VARCHAR(255) NULL DEFAULT NULL,
  `fax` VARCHAR(32) NULL DEFAULT NULL,
  `ren` VARCHAR(64) NULL DEFAULT NULL,
  `num_albo_gestori` VARCHAR(64) NULL DEFAULT NULL,
  `anga_cat1` TINYINT(1) NOT NULL DEFAULT 0,
  `anga_cat1_data` DATE NULL DEFAULT NULL,
  `anga_cat4` TINYINT(1) NOT NULL DEFAULT 0,
  `anga_cat4_data` DATE NULL DEFAULT NULL,
  `anga_cat5` TINYINT(1) NOT NULL DEFAULT 0,
  `anga_cat5_data` DATE NULL DEFAULT NULL,
  `attivita_svolta` TEXT NULL,

  `resp_contabilita` VARCHAR(255) NULL DEFAULT NULL,
  `resp_contabilita_tel` VARCHAR(32) NULL DEFAULT NULL,
  `resp_contabilita_cell` VARCHAR(32) NULL DEFAULT NULL,
  `resp_commerciale` VARCHAR(255) NULL DEFAULT NULL,
  `resp_commerciale_tel` VARCHAR(32) NULL DEFAULT NULL,
  `resp_commerciale_cell` VARCHAR(32) NULL DEFAULT NULL,
  `resp_logistica` VARCHAR(255) NULL DEFAULT NULL,
  `resp_logistica_tel` VARCHAR(32) NULL DEFAULT NULL,
  `resp_logistica_cell` VARCHAR(32) NULL DEFAULT NULL,
  `resp_amministrativo` VARCHAR(255) NULL DEFAULT NULL,

  `mercato_nazionale` TINYINT(1) NOT NULL DEFAULT 0,
  `mercato_internazionale` TINYINT(1) NOT NULL DEFAULT 0,
  `nazioni` VARCHAR(255) NULL DEFAULT NULL,
  `n_personale` INT UNSIGNED NULL DEFAULT NULL,
  `n_dirigenti` INT UNSIGNED NULL DEFAULT NULL,
  `n_impiegati` INT UNSIGNED NULL DEFAULT NULL,
  `n_operai` INT UNSIGNED NULL DEFAULT NULL,

  `fatturato_anno_1` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `fatturato_importo_1` DECIMAL(14,2) NULL DEFAULT NULL,
  `fatturato_anno_2` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `fatturato_importo_2` DECIMAL(14,2) NULL DEFAULT NULL,
  `fatturato_anno_3` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `fatturato_importo_3` DECIMAL(14,2) NULL DEFAULT NULL,

  `cliente_1` VARCHAR(255) NULL DEFAULT NULL,
  `prodotto_1` VARCHAR(255) NULL DEFAULT NULL,
  `perc_fatturato_1` DECIMAL(5,2) NULL DEFAULT NULL,
  `cliente_2` VARCHAR(255) NULL DEFAULT NULL,
  `prodotto_2` VARCHAR(255) NULL DEFAULT NULL,
  `perc_fatturato_2` DECIMAL(5,2) NULL DEFAULT NULL,
  `cliente_3` VARCHAR(255) NULL DEFAULT NULL,
  `prodotto_3` VARCHAR(255) NULL DEFAULT NULL,
  `perc_fatturato_3` DECIMAL(5,2) NULL DEFAULT NULL,

  -- Allegato I
  `massimale_vettoriale` DECIMAL(14,2) NULL DEFAULT NULL,
  `massimale_rc_auto` DECIMAL(14,2) NULL DEFAULT NULL,
  `massimale_rct_rco` DECIMAL(14,2) NULL DEFAULT NULL,

  -- Nominativi condizionali (5.4, 7.4, 8.4, 10.4)
  `resp_qualita` VARCHAR(255) NULL DEFAULT NULL,
  `resp_qualita_tel` VARCHAR(32) NULL DEFAULT NULL,
  `resp_ambientale` VARCHAR(255) NULL DEFAULT NULL,
  `resp_ambientale_tel` VARCHAR(32) NULL DEFAULT NULL,
  `dl_nome` VARCHAR(255) NULL DEFAULT NULL,
  `dl_tel` VARCHAR(32) NULL DEFAULT NULL,
  `rspp_nome` VARCHAR(255) NULL DEFAULT NULL,
  `rspp_tel` VARCHAR(32) NULL DEFAULT NULL,
  `resp_haccp` VARCHAR(255) NULL DEFAULT NULL,
  `resp_haccp_tel` VARCHAR(32) NULL DEFAULT NULL,

  -- 5 Qualità
  `q_5_1_iso9001` TINYINT(1) NULL DEFAULT NULL,
  `q_5_2_piano_iso9001` TINYINT(1) NULL DEFAULT NULL,
  `q_5_3_politica_qualita` TINYINT(1) NULL DEFAULT NULL,
  `q_5_4_resp_qualita` TINYINT(1) NULL DEFAULT NULL,
  `q_5_5_responsabilita` TINYINT(1) NULL DEFAULT NULL,
  `q_5_6_audit_interni` TINYINT(1) NULL DEFAULT NULL,
  `q_5_7_riunione_coord` TINYINT(1) NULL DEFAULT NULL,
  `q_5_8_procedure_generali` TINYINT(1) NULL DEFAULT NULL,
  `q_5_9_rimorchi_cassonati` TINYINT(1) NULL DEFAULT NULL,
  `q_5_10_rimorchi_vasche` TINYINT(1) NULL DEFAULT NULL,
  `q_5_11_rimorchi_centinati` TINYINT(1) NULL DEFAULT NULL,
  `q_5_12_rimorchi_silos` TINYINT(1) NULL DEFAULT NULL,
  `q_5_13_manichette_silos` TINYINT(1) NULL DEFAULT NULL,
  `q_5_14_manutenzione_mezzi` TINYINT(1) NULL DEFAULT NULL,
  `q_5_15_no_subvezione_terzi` TINYINT(1) NULL DEFAULT NULL,

  -- 6 Acquisti (solo se non certificati ISO 9001)
  `q_6_1_resp_acquisti` TINYINT(1) NULL DEFAULT NULL,
  `q_6_2_procedure_acquisti` TINYINT(1) NULL DEFAULT NULL,
  `q_6_3_conformita_acquisti` TINYINT(1) NULL DEFAULT NULL,
  `q_6_4a_selezione_fornitori` TINYINT(1) NULL DEFAULT NULL,
  `q_6_4b_sorveglianza_forniture` TINYINT(1) NULL DEFAULT NULL,
  `q_6_4c_ispezione_ricevimento` TINYINT(1) NULL DEFAULT NULL,
  `q_6_5_elenco_fornitori` TINYINT(1) NULL DEFAULT NULL,
  `q_6_6_certificati_fornitori` TINYINT(1) NULL DEFAULT NULL,

  -- 7 Ambiente
  `q_7_1_iso14001` TINYINT(1) NULL DEFAULT NULL,
  `q_7_2_piano_iso14001` TINYINT(1) NULL DEFAULT NULL,
  `q_7_3_politica_ambiente` TINYINT(1) NULL DEFAULT NULL,
  `q_7_4_resp_ambientale` TINYINT(1) NULL DEFAULT NULL,
  `q_7_5_analisi_ambientale` TINYINT(1) NULL DEFAULT NULL,
  `q_7_6_formazione_rifiuti` TINYINT(1) NULL DEFAULT NULL,
  `q_7_7_kit_antisversamento` TINYINT(1) NULL DEFAULT NULL,
  `q_7_8_pronto_intervento` TINYINT(1) NULL DEFAULT NULL,
  `q_7_9_verifica_trasporti` TINYINT(1) NULL DEFAULT NULL,
  `q_7_10_mezzi_autorizzati_anga` TINYINT(1) NULL DEFAULT NULL,
  `q_7_11_quantitativi_anga` TINYINT(1) NULL DEFAULT NULL,
  `q_7_12_mud_152` TINYINT(1) NULL DEFAULT NULL,

  -- 8 Sicurezza
  `q_8_1_iso45001` TINYINT(1) NULL DEFAULT NULL,
  `q_8_2_piano_iso45001` TINYINT(1) NULL DEFAULT NULL,
  `q_8_3_politica_sicurezza` TINYINT(1) NULL DEFAULT NULL,
  `q_8_4_dl_rspp` TINYINT(1) NULL DEFAULT NULL,
  `q_8_5_infortuni` TINYINT(1) NULL DEFAULT NULL,
  `q_8_6_verbali_autisti` TINYINT(1) NULL DEFAULT NULL,
  `q_8_7_dvr_dpi` TINYINT(1) NULL DEFAULT NULL,
  `q_8_8_schede_dpi` TINYINT(1) NULL DEFAULT NULL,
  `q_8_9_attestato_mansione` TINYINT(1) NULL DEFAULT NULL,
  `q_8_10_dpi_iii_categoria` TINYINT(1) NULL DEFAULT NULL,
  `q_8_11_norme_siti` TINYINT(1) NULL DEFAULT NULL,
  `q_8_12_protocollo_sanitario` TINYINT(1) NULL DEFAULT NULL,

  -- 9 Altri
  `q_9_1_sqas` TINYINT(1) NULL DEFAULT NULL,
  `q_9_2_diagnosi_energetica` TINYINT(1) NULL DEFAULT NULL,

  -- 10 HACCP / GMP+
  `q_10_1_gmp` TINYINT(1) NULL DEFAULT NULL,
  `q_10_2_sicurezza_alimentare` TINYINT(1) NULL DEFAULT NULL,
  `q_10_3_politica_alimentare` TINYINT(1) NULL DEFAULT NULL,
  `q_10_4_resp_alimentare` TINYINT(1) NULL DEFAULT NULL,
  `q_10_5_scia_asl` TINYINT(1) NULL DEFAULT NULL,
  `q_10_6_tracciabilita` TINYINT(1) NULL DEFAULT NULL,
  `q_10_7_audit_tracciabilita` TINYINT(1) NULL DEFAULT NULL,
  `q_10_8_pcc_poa` TINYINT(1) NULL DEFAULT NULL,
  `q_10_9_manuale_autocontrollo` TINYINT(1) NULL DEFAULT NULL,
  `q_10_10_haccp_autisti` TINYINT(1) NULL DEFAULT NULL,
  `q_10_11_mezzi_alimentari` TINYINT(1) NULL DEFAULT NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subvettore_anno` (`subvettore_id`, `anno`),
  KEY `idx_dichiarazioni_documento` (`documento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

