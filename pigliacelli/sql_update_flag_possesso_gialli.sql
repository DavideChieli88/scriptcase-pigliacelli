-- =============================================================================
-- tipi_documento: allinea flag_possesso ai documenti "gialli" (Se in possesso)
-- Schema: mandatory, from_preset, is_readonly, flag_possesso, tipo_collegato_id
--
-- Gialli (Excel / docs):
--   8  Polizza vettoriale          (+ quietanza id 23)
--   11 Autorizzazioni ANGA
--   12 Ricevuta pagamento ANGA
--   13 Iscrizione RENTRI
--   14 Ricevuta pagamento RENTRI
--   15 Polizza RCT/RCO             (quietanza RCT se esiste in DB)
--   (+ Permesso soggiorno se presente come tipo separato)
--
-- Regola:
--   flag_possesso=1 → UI "Sei in possesso?"; file obbligatorio solo se in_possesso=1
--   mandatory=0 sui gialli (non sono obbligatori a prescindere)
--   tipo_collegato_id sul TIPO PADRE → punta alla Quietanza (non il contrario)
-- =============================================================================

-- 0) Baseline: nessuno in possesso tranne i gialli sotto
UPDATE tipi_documento
SET flag_possesso = 0
WHERE flag_possesso IS NULL OR flag_possesso <> 0;

-- 1) Attiva flag_possesso sui gialli + non mandatory + upload (non readonly)
UPDATE tipi_documento
SET
    flag_possesso = 1,
    mandatory     = 0,
    is_readonly   = 0
WHERE id IN (8, 11, 12, 13, 14, 15);

-- 2) Collegamento Quietanza: il PADRE punta alla quietanza
--    (oggi in tabella le quietanze 23/24 puntano al padre: va invertito)
UPDATE tipi_documento
SET tipo_collegato_id = NULL
WHERE id IN (23, 24, 25);

UPDATE tipi_documento
SET tipo_collegato_id = 23
WHERE id = 8;   -- Polizza vettoriale → Quietanza - Polizza vettoriale

-- Se esiste "Quietanza - Polizza RCT/RCO", collega anche il 15:
-- UPDATE tipi_documento SET tipo_collegato_id = <id_quietanza_rct>
-- WHERE id = 15;

-- 3) Verifica
SELECT id, nome, mandatory, from_preset, is_readonly, flag_possesso, tipo_collegato_id
FROM tipi_documento
WHERE id IN (8, 11, 12, 13, 14, 15, 16, 23, 24, 25)
ORDER BY id;
