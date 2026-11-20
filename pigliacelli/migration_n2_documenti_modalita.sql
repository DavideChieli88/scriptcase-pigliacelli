-- ============================================================
-- N2 — aggiunge solo `documenti.modalita`
-- (presa_visione_at, firmato_il, sign_boxes_json già presenti)
--
-- Prima di applicare:
--   SHOW COLUMNS FROM documenti LIKE 'modalita';
-- Se la colonna esiste già, non eseguire questo file.
-- ============================================================

ALTER TABLE `documenti`
  ADD COLUMN `modalita` ENUM('upload','visione','firma') NOT NULL DEFAULT 'upload'
    COMMENT 'upload=flusso storico subv; visione|firma=invio PGL (N2)'
    AFTER `sign_boxes_json`;

-- Se AFTER sign_boxes_json fallisce (ordine colonne diverso), usa senza AFTER:
-- ALTER TABLE `documenti`
--   ADD COLUMN `modalita` ENUM('upload','visione','firma') NOT NULL DEFAULT 'upload'
--     COMMENT 'upload=flusso storico subv; visione|firma=invio PGL (N2)';

ALTER TABLE `documenti`
  ADD INDEX `idx_documenti_modalita` (`modalita`);

-- I record esistenti restano modalita='upload' grazie al DEFAULT.
-- Nessun UPDATE di backfill necessario.
--
-- App storiche (form_documenti / wizard): in onBeforeInsert+Update
-- forzare {modalita} = 'upload' altrimenti SC manda '' → Data truncated.
