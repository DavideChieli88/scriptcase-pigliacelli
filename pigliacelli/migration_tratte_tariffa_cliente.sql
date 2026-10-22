-- Nolo cliente (T2ViaggiClienti.IMPORTO_TOTALE), distinto da tratte.tariffa del subvettore.
-- Non tocca le righe già presenti: la colonna nasce NULL.
-- Va eseguito prima di check_new_trips_nuovo_contratto_basevettori_v2
-- e di insert_new_trips_optimized_basevettori_v2.

ALTER TABLE tratte
  ADD COLUMN tariffa_cliente DECIMAL(14,2) NULL DEFAULT NULL;
