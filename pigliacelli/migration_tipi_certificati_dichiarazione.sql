-- Tipi documento dei certificati chiesti dalla dichiarazione.
-- Eseguire una volta. Se il nome c'è già, non inserisce un doppione.
-- mandatory=1: quando esiste lo slot aziendale, lo step documenti chiede file e scadenza.
-- from_preset=0: non vengono creati per tutti i subvettori, solo al salvataggio se la risposta è Sì.

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Certificato ISO 9001', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Certificato ISO 9001')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Certificato ISO 14001', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Certificato ISO 14001')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Certificato ISO 45001', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Certificato ISO 45001')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Certificato SQAS', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Certificato SQAS')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Diagnosi energetica', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Diagnosi energetica')
);

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'Attestazione invio ENEA diagnosi energetica', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento WHERE LOWER(TRIM(nome)) = LOWER('Attestazione invio ENEA diagnosi energetica')
);
