-- =============================================================================
-- bonifica_uat_basevettori.sql
-- Database: pigliacelli (UAT)
-- Scopo: pulizia dati legacy BaCliFor prima re-import T2BaseVettori
--
-- NON tocca: stati_contratti, tipo_contratti, tipo_tariffe, societa, fornitori,
--            operatori sec_users (subvettore_id IS NULL), sec_settings (salvo sync_date)
--
-- Dopo questo script, ordine job consigliato:
--   1) insert_new_subvectors_basevettori
--   2) insert_subvectors_in_sec_users_basevettori
--   3) insert_new_trips_optimized_basevettori
--   4) check_new_trips_nuovo_contratto_basevettori (contratti incrementali)
--
-- Opzionale: cancellare PDF orfani nella cartella sec_settings.contratti_base_dir
-- =============================================================================

-- Verifica ambiente (opzionale: decommentare e adattare)
-- SELECT DATABASE() AS db_corrente;

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1) Documenti collegati a utenze subvettore (FK documenti.login -> sec_users.login)
-- ---------------------------------------------------------------------------
DELETE d
FROM documenti d
INNER JOIN sec_users su ON su.login = d.login
WHERE su.subvettore_id IS NOT NULL;

-- Se in UAT vuoi azzerare TUTTI i documenti (anche operatori), decommentare:
-- TRUNCATE TABLE documenti;

-- ---------------------------------------------------------------------------
-- 2) Contratti e tratte (ordine figli -> genitori)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE contratti_tratte;
TRUNCATE TABLE tratte_localita;
TRUNCATE TABLE subvettori_autisti;
TRUNCATE TABLE subvettori_contratti;
TRUNCATE TABLE contratti;
TRUNCATE TABLE tratte;
TRUNCATE TABLE subvettori;

-- ---------------------------------------------------------------------------
-- 3) Utenze subvettore (gruppi prima, poi sec_users)
-- ---------------------------------------------------------------------------
DELETE sug
FROM sec_users_groups sug
INNER JOIN sec_users su ON su.login = sug.login
WHERE su.subvettore_id IS NOT NULL;

DELETE FROM sec_users
WHERE subvettore_id IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 4) sync_date — reset per import storico + job incrementale pulito
--    insert_new_trips_optimized_basevettori lo aggiornerà al max timestamp
--    dei viaggi importati (solo se > di questo valore).
-- ---------------------------------------------------------------------------
UPDATE sec_settings
SET set_value = '1900-01-01 00:00:00'
WHERE set_name = 'sync_date';

COMMIT;

-- ---------------------------------------------------------------------------
-- 5) Verifica post-bonifica
-- ---------------------------------------------------------------------------
SELECT 'subvettori' AS tabella, COUNT(*) AS n FROM subvettori
UNION ALL SELECT 'tratte', COUNT(*) FROM tratte
UNION ALL SELECT 'tratte_localita', COUNT(*) FROM tratte_localita
UNION ALL SELECT 'contratti', COUNT(*) FROM contratti
UNION ALL SELECT 'subvettori_contratti', COUNT(*) FROM subvettori_contratti
UNION ALL SELECT 'contratti_tratte', COUNT(*) FROM contratti_tratte
UNION ALL SELECT 'subvettori_autisti', COUNT(*) FROM subvettori_autisti
UNION ALL SELECT 'sec_users_sub', COUNT(*) FROM sec_users WHERE subvettore_id IS NOT NULL
UNION ALL SELECT 'documenti_sub', COUNT(*) FROM documenti d
    INNER JOIN sec_users su ON su.login = d.login WHERE su.subvettore_id IS NOT NULL;

SELECT set_name, set_value
FROM sec_settings
WHERE set_name IN ('sync_date', 'export_viaggi_anno', 'export_viaggi_societa');
