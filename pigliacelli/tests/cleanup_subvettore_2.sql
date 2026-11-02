-- =============================================================================
-- cleanup_subvettore_2.sql
-- Database: pigliacelli (DEV / UAT)
-- Scopo: rimuovere contratti, tratte, documenti, autisti, mezzi, dichiarazioni
--        e utenze (sec_users / sec_users_groups) del subvettore id = 2.
-- NON cancella: riga subvettori, sec_settings, altri subvettori.
--
-- Utenze: cancella login con subvettore_id = @sid (e il login_subvettore
--         se diverso). Se un account ha anche gruppi != 2, toglie solo il
--         collegamento al sub e il group_id = 2 (non cancella l'account).
--
-- Esegui il blocco START..COMMIT in un'unica selezione (phpMyAdmin).
-- =============================================================================

SET @sid := 2;

-- --- PRE-VERIFICA ---
SELECT id, codice_sga, login_subvettore, wizard_complete, pec
FROM subvettori
WHERE id = @sid;

SELECT su.login, su.email, su.subvettore_id, sug.group_id
FROM sec_users su
LEFT JOIN sec_users_groups sug ON sug.login = su.login
WHERE su.subvettore_id = @sid
   OR su.login = (SELECT login_subvettore FROM subvettori WHERE id = @sid LIMIT 1);

SELECT 'documenti' AS t, COUNT(*) AS n FROM documenti
 WHERE subvettore_id = @sid
    OR subvettore_autista_id IN (SELECT id FROM subvettori_autisti WHERE subvettore_id = @sid)
    OR subvettore_mezzo_id IN (SELECT id FROM subvettori_mezzi WHERE subvettore_id = @sid)
UNION ALL SELECT 'dichiarazioni', COUNT(*) FROM subvettori_dichiarazioni WHERE subvettore_id = @sid
UNION ALL SELECT 'autisti', COUNT(*) FROM subvettori_autisti WHERE subvettore_id = @sid
UNION ALL SELECT 'mezzi', COUNT(*) FROM subvettori_mezzi WHERE subvettore_id = @sid
UNION ALL SELECT 'tratte', COUNT(*) FROM tratte WHERE subvettore_id = @sid
UNION ALL SELECT 'sub_contratti', COUNT(*) FROM subvettori_contratti WHERE subvettore_id = @sid
UNION ALL SELECT 'contratti', COUNT(*)
  FROM contratti c
 INNER JOIN subvettori_contratti sc ON sc.contratto_id = c.id
 WHERE sc.subvettore_id = @sid
UNION ALL SELECT 'sec_users_sub', COUNT(*) FROM sec_users WHERE subvettore_id = @sid;

CREATE TEMPORARY TABLE tmp_contratti_sid AS
SELECT DISTINCT sc.contratto_id AS id
FROM subvettori_contratti sc
WHERE sc.subvettore_id = @sid;

CREATE TEMPORARY TABLE tmp_logins_sid AS
SELECT DISTINCT su.login
FROM sec_users su
WHERE su.subvettore_id = @sid
UNION
SELECT s.login_subvettore
FROM subvettori s
WHERE s.id = @sid
  AND s.login_subvettore IS NOT NULL
  AND TRIM(s.login_subvettore) <> '';

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Documenti (azienda + autisti + mezzi del sub)
DELETE d FROM documenti d
WHERE d.subvettore_id = @sid
   OR d.subvettore_autista_id IN (SELECT id FROM subvettori_autisti WHERE subvettore_id = @sid)
   OR d.subvettore_mezzo_id IN (SELECT id FROM subvettori_mezzi WHERE subvettore_id = @sid);

-- 2) Dichiarazioni
DELETE FROM subvettori_dichiarazioni WHERE subvettore_id = @sid;

-- 3) Link autista-mezzo, autisti, mezzi
DELETE FROM subvettori_autisti_mezzi WHERE subvettore_id = @sid;
DELETE FROM subvettori_autisti WHERE subvettore_id = @sid;
DELETE FROM subvettori_mezzi WHERE subvettore_id = @sid;

-- 4) Contratti / tratte
DELETE ct FROM contratti_tratte ct
INNER JOIN tmp_contratti_sid t ON t.id = ct.contratto_id;

DELETE tl FROM tratte_localita tl
INNER JOIN tratte tr ON tr.id = tl.tratta_id
WHERE tr.subvettore_id = @sid;

DELETE FROM subvettori_contratti WHERE subvettore_id = @sid;

DELETE c FROM contratti c
INNER JOIN tmp_contratti_sid t ON t.id = c.id;

DELETE FROM tratte WHERE subvettore_id = @sid;

-- 5) Utenze: gruppi, poi account solo-gruppo-2 (o solo legati a questo sub)
DELETE sug FROM sec_users_groups sug
INNER JOIN tmp_logins_sid t ON t.login = sug.login;

-- Account che non hanno altri gruppi: cancellali
DELETE su FROM sec_users su
INNER JOIN tmp_logins_sid t ON t.login = su.login
WHERE NOT EXISTS (
    SELECT 1 FROM sec_users_groups g WHERE g.login = su.login
);

-- Se restasse un login con altri gruppi (caso raro): stacca solo il sub
UPDATE sec_users su
INNER JOIN tmp_logins_sid t ON t.login = su.login
SET su.subvettore_id = NULL
WHERE su.subvettore_id = @sid;

-- Pulisci riferimento login sull'anagrafica (sub resta)
UPDATE subvettori
SET login_subvettore = NULL,
    mail_credenziali_inviata_at = NULL
WHERE id = @sid;

SET FOREIGN_KEY_CHECKS = 1;

-- --- POST-VERIFICA (prima di COMMIT) ---
SELECT 'documenti' AS t, COUNT(*) AS n FROM documenti WHERE subvettore_id = @sid
UNION ALL SELECT 'dichiarazioni', COUNT(*) FROM subvettori_dichiarazioni WHERE subvettore_id = @sid
UNION ALL SELECT 'autisti', COUNT(*) FROM subvettori_autisti WHERE subvettore_id = @sid
UNION ALL SELECT 'mezzi', COUNT(*) FROM subvettori_mezzi WHERE subvettore_id = @sid
UNION ALL SELECT 'tratte', COUNT(*) FROM tratte WHERE subvettore_id = @sid
UNION ALL SELECT 'sub_contratti', COUNT(*) FROM subvettori_contratti WHERE subvettore_id = @sid
UNION ALL SELECT 'contratti_tmp', COUNT(*)
  FROM contratti c INNER JOIN tmp_contratti_sid t ON t.id = c.id
UNION ALL SELECT 'sec_users_sub', COUNT(*) FROM sec_users WHERE subvettore_id = @sid
UNION ALL SELECT 'sec_users_logins', COUNT(*)
  FROM sec_users su INNER JOIN tmp_logins_sid t ON t.login = su.login;

-- Se i conteggi sono 0:
COMMIT;
-- oppure ROLLBACK;

DROP TEMPORARY TABLE IF EXISTS tmp_contratti_sid;
DROP TEMPORARY TABLE IF EXISTS tmp_logins_sid;
