-- =============================================================================
-- bonifica_uat_basevettori.sql
-- Database: pigliacelli (UAT)
-- Scopo: pulizia dati legacy BaCliFor prima re-import T2BaseVettori
--
-- NON tocca: stati_contratti, tipo_contratti, tipo_tariffe, societa, fornitori,
--            sec_users che appartengono anche a un gruppo diverso da 2,
--            sec_settings (salvo sync_date)
--
-- Utenti: si toglie sempre sec_users_groups.group_id = 2.
-- L'account sec_users si cancella solo se non ha altri gruppi.
-- Se ha altri gruppi, resta e subvettore_id viene messo a NULL.
--
-- Dopo questo script, ordine job consigliato:
--   1) upsert_subvectors_basevettori (+ bootstrap documenti preset)
--   2) send_credenziali_subvettori_batch
--   3) insert_new_trips_optimized_basevettori / check_new_trips_*
--
-- Opzionale: cancellare PDF orfani nella cartella sec_settings.contratti_base_dir
-- =============================================================================

-- Verifica ambiente (opzionale: decommentare e adattare)
-- SELECT DATABASE() AS db_corrente;

-- Nota phpMyAdmin / client SQL:
-- Esegui QUESTO blocco (da START TRANSACTION a COMMIT) in un'unica selezione.
-- Non usare TRUNCATE sulle tabelle referenziate da FK: MySQL alza #1701
-- anche se la tabella figlia è vuota. Qui usiamo DELETE in ordine figlio→padre
-- + FOREIGN_KEY_CHECKS=0 come rete di sicurezza nella stessa sessione.

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1) Figlie che puntano a subvettori / autisti / mezzi / contratti / tratte
-- ---------------------------------------------------------------------------
DELETE FROM documenti;
DELETE FROM subvettori_dichiarazioni;
DELETE FROM subvettori_autisti_mezzi;
DELETE FROM subvettori_autisti;
DELETE FROM subvettori_mezzi;
DELETE FROM contratti_tratte;
DELETE FROM tratte_localita;
DELETE FROM subvettori_contratti;
DELETE FROM contratti;
DELETE FROM tratte;

-- ---------------------------------------------------------------------------
-- 2) Utenti gruppo 2, poi subvettori
--    Prima gli account che stanno SOLO nel gruppo 2.
--    Poi tutte le righe sec_users_groups del gruppo 2.
--    Chi resta in un altro gruppo perde solo il collegamento al subvettore.
-- ---------------------------------------------------------------------------
DELETE su
FROM sec_users su
INNER JOIN sec_users_groups sug
    ON sug.login = su.login
   AND sug.group_id = 2
WHERE NOT EXISTS (
    SELECT 1
    FROM sec_users_groups g
    WHERE g.login = su.login
      AND g.group_id <> 2
);

DELETE FROM sec_users_groups
WHERE group_id = 2;

UPDATE sec_users
SET subvettore_id = NULL
WHERE subvettore_id IS NOT NULL;

DELETE FROM subvettori;

-- ---------------------------------------------------------------------------
-- 3) Reset AUTO_INCREMENT (equivalente pratico al TRUNCATE)
--    ALTER è DDL: fa commit implicito. Eseguire nello stesso giro, dopo i DELETE.
-- ---------------------------------------------------------------------------
ALTER TABLE documenti AUTO_INCREMENT = 1;
ALTER TABLE subvettori_dichiarazioni AUTO_INCREMENT = 1;
ALTER TABLE subvettori_autisti_mezzi AUTO_INCREMENT = 1;
ALTER TABLE subvettori_autisti AUTO_INCREMENT = 1;
ALTER TABLE subvettori_mezzi AUTO_INCREMENT = 1;
ALTER TABLE contratti_tratte AUTO_INCREMENT = 1;
ALTER TABLE tratte_localita AUTO_INCREMENT = 1;
ALTER TABLE subvettori_contratti AUTO_INCREMENT = 1;
ALTER TABLE contratti AUTO_INCREMENT = 1;
ALTER TABLE tratte AUTO_INCREMENT = 1;
ALTER TABLE subvettori AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 5) sync_date — reset per import storico + job incrementale pulito
-- ---------------------------------------------------------------------------
UPDATE sec_settings
SET set_value = '1900-01-01 00:00:00'
WHERE set_name = 'sync_date';

COMMIT;

-- ---------------------------------------------------------------------------
-- 6) Verifica post-bonifica
-- ---------------------------------------------------------------------------
SELECT 'subvettori' AS tabella, COUNT(*) AS n FROM subvettori
UNION ALL SELECT 'tratte', COUNT(*) FROM tratte
UNION ALL SELECT 'tratte_localita', COUNT(*) FROM tratte_localita
UNION ALL SELECT 'contratti', COUNT(*) FROM contratti
UNION ALL SELECT 'subvettori_contratti', COUNT(*) FROM subvettori_contratti
UNION ALL SELECT 'contratti_tratte', COUNT(*) FROM contratti_tratte
UNION ALL SELECT 'subvettori_autisti', COUNT(*) FROM subvettori_autisti
UNION ALL SELECT 'subvettori_mezzi', COUNT(*) FROM subvettori_mezzi
UNION ALL SELECT 'subvettori_autisti_mezzi', COUNT(*) FROM subvettori_autisti_mezzi
UNION ALL SELECT 'subvettori_dichiarazioni', COUNT(*) FROM subvettori_dichiarazioni
UNION ALL SELECT 'sec_users_g2', COUNT(*) FROM sec_users_groups WHERE group_id = 2
UNION ALL SELECT 'sec_users_sub', COUNT(*) FROM sec_users WHERE subvettore_id IS NOT NULL
UNION ALL SELECT 'documenti_sub', COUNT(*) FROM documenti
    WHERE subvettore_id IS NOT NULL
       OR subvettore_autista_id IS NOT NULL
       OR subvettore_mezzo_id IS NOT NULL;

SELECT set_name, set_value
FROM sec_settings
WHERE set_name IN ('sync_date', 'export_viaggi_anno', 'export_viaggi_societa');


-- =============================================================================
-- 7) Bonifica chirurgica: tratte/contratti con importo non valido (tariffa/totale <= 0)
--    Allineata a importo_unitario_valido() del job (importo > 0).
--    NON tocca contratti firmati (firmato_il valorizzato).
--    Eseguire su UAT dopo dump/backup; verificare SELECT pre/post, poi COMMIT.
-- =============================================================================

-- --- PRE-VERIFICA (eseguire prima del DELETE) ---
SELECT 'ct_tariffa_zero_non_firmati' AS check_name, COUNT(*) AS n
FROM contratti_tratte ct
INNER JOIN contratti c ON c.id = ct.contratto_id
WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
  AND (ct.tariffa IS NULL OR ct.tariffa = 0 OR ABS(ct.tariffa) < 0.00001);

SELECT 'ct_tratta_tariffa_zero_non_firmati' AS check_name, COUNT(*) AS n
FROM contratti_tratte ct
INNER JOIN tratte t ON t.id = ct.tratta_id
INNER JOIN contratti c ON c.id = ct.contratto_id
WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
  AND (t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001);

SELECT 'tratte_tariffa_zero' AS check_name, COUNT(*) AS n
FROM tratte t
WHERE t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001;

SELECT 'contratti_vuoti_non_firmati' AS check_name, COUNT(*) AS n
FROM contratti c
LEFT JOIN contratti_tratte ct ON ct.contratto_id = c.id
WHERE ct.id IS NULL
  AND (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00');

SELECT 'contratti_solo_righe_zero_non_firmati' AS check_name, COUNT(*) AS n
FROM (
    SELECT c.id
    FROM contratti c
    INNER JOIN contratti_tratte ct ON ct.contratto_id = c.id
    WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
    GROUP BY c.id
    HAVING SUM(
        CASE
            WHEN ct.tariffa IS NOT NULL AND ct.tariffa > 0 AND ABS(ct.tariffa) >= 0.00001 THEN 1
            ELSE 0
        END
    ) = 0
) solo_zero;

START TRANSACTION;

-- A1) contratti_tratte con tariffa non valida (0 / NULL), solo contratti NON firmati
DELETE ct FROM contratti_tratte ct
INNER JOIN contratti c ON c.id = ct.contratto_id
WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
  AND (ct.tariffa IS NULL OR ct.tariffa = 0 OR ABS(ct.tariffa) < 0.00001);

-- A2) contratti_tratte legate a tratte con tariffa non valida
DELETE ct FROM contratti_tratte ct
INNER JOIN tratte t ON t.id = ct.tratta_id
INNER JOIN contratti c ON c.id = ct.contratto_id
WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
  AND (t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001);

-- B) subvettori_autisti su contratti che diventano vuoti (FK su subvettori_contratti.id)
DELETE sa FROM subvettori_autisti sa
INNER JOIN subvettori_contratti sc ON sc.id = sa.subvettore_contratto_id
INNER JOIN contratti c ON c.id = sc.contratto_id
LEFT JOIN contratti_tratte ct ON ct.contratto_id = c.id
WHERE ct.id IS NULL
  AND (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00');

-- C) subvettori_contratti PRIMA di contratti (evita FK #1451)
DELETE sc FROM subvettori_contratti sc
INNER JOIN contratti c ON c.id = sc.contratto_id
LEFT JOIN contratti_tratte ct ON ct.contratto_id = c.id
WHERE ct.id IS NULL
  AND (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00');

-- D) contratti senza alcuna riga in contratti_tratte (non firmati)
DELETE c FROM contratti c
LEFT JOIN contratti_tratte ct ON ct.contratto_id = c.id
WHERE ct.id IS NULL
  AND (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00');

-- E) tratte a tariffa 0 / NULL orfane (nessun contratto le referenzia più)
DELETE tl FROM tratte_localita tl
INNER JOIN tratte t ON t.id = tl.tratta_id
LEFT JOIN contratti_tratte ct ON ct.tratta_id = t.id
WHERE ct.id IS NULL
  AND (t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001);

DELETE t FROM tratte t
LEFT JOIN contratti_tratte ct ON ct.tratta_id = t.id
WHERE ct.id IS NULL
  AND (t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001);

-- --- POST-VERIFICA (dopo DELETE, prima di COMMIT) ---
SELECT 'ct_tariffa_zero_non_firmati' AS check_name, COUNT(*) AS n
FROM contratti_tratte ct
INNER JOIN contratti c ON c.id = ct.contratto_id
WHERE (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00')
  AND (ct.tariffa IS NULL OR ct.tariffa = 0 OR ABS(ct.tariffa) < 0.00001);

SELECT 'tratte_tariffa_zero_orfane' AS check_name, COUNT(*) AS n
FROM tratte t
LEFT JOIN contratti_tratte ct ON ct.tratta_id = t.id
WHERE ct.id IS NULL
  AND (t.tariffa IS NULL OR t.tariffa = 0 OR ABS(t.tariffa) < 0.00001);

SELECT 'contratti_vuoti_non_firmati' AS check_name, COUNT(*) AS n
FROM contratti c
LEFT JOIN contratti_tratte ct ON ct.contratto_id = c.id
WHERE ct.id IS NULL
  AND (c.firmato_il IS NULL OR c.firmato_il = '0000-00-00 00:00:00');

-- Se i numeri post-verifica sono 0 (o solo firmati residui), poi:
COMMIT;
-- oppure ROLLBACK;
