-- Allinea stati documenti gia' caricati/firmati ma rimasti a stato 1.
-- 2 = Caricato

-- Upload con file presente
UPDATE documenti
SET stato_documento_id = 2,
    updated_at = NOW()
WHERE COALESCE(stato_documento_id, 0) IN (0, 1)
  AND file IS NOT NULL
  AND TRIM(file) <> '';

-- Firmati (verdi EasyGN)
UPDATE documenti
SET stato_documento_id = 2,
    updated_at = NOW()
WHERE COALESCE(stato_documento_id, 0) IN (0, 1)
  AND firmato_il IS NOT NULL
  AND firmato_il <> '0000-00-00 00:00:00';
