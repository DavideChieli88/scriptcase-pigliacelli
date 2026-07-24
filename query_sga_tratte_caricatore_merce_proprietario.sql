-- =============================================================================
-- Test SGA — caricatore, proprietario_merce, merce (chiarimenti Cerroni 09/07/2026)
-- Eseguire su SQL Server SGA (SSMS / Azure Data Studio). Solo lettura.
--
-- Mappatura Pigliacelli:
--   caricatore         = T2ViaggiClientiCarichiScarichi.CARICO_RAGIONE_SOCIALE
--   proprietario_merce = BaCliFor.RAGIONE_SOCIALE (cliente ordine, CLIENTE_FORNITORE = 'C')
--   merce              = T2ViaggiClientiCarichiScarichiMerci.MERCE_DESCRIZIONE (+ codice)
--
-- Percorso:
--   T2ViaggiVettori
--     → T2ViaggiVettoriClienti (ponte; usare righe C/S, campi CLIENTE_*)
--     → T2ViaggiClientiCarichiScarichi
--     → T2ViaggiClienti + BaCliFor
--     → T2ViaggiClientiCarichiScarichiMerci
--
-- Chiavi join ordine cliente (5 campi):
--   SOCIETA, ANNO, FILIALE, NUMERO, NUMERO_CARICO_SCARICO
-- Da T2ViaggiVettoriClienti: CLIENTE_ANNO, CLIENTE_FILIALE, CLIENTE_NUMERO,
--                             CLIENTE_NUMERO_CARICO_SCARICO
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Query 1 — dettaglio (una riga per riga merce; utile per vedere duplicati/join)
-- -----------------------------------------------------------------------------
SELECT TOP 100
    v.SOCIETA,
    v.ANNO              AS viaggio_vettore_anno,
    v.NUMERO            AS viaggio_vettore_numero,
    v.VETTORE           AS codice_vettore,
    vc.OPERAZIONE       AS stop_operazione,
    vc.PROGRESSIVO      AS stop_progressivo,
    RTRIM(vc.LOCALITA)  AS stop_localita,
    vc.CLIENTE_ANNO,
    vc.CLIENTE_FILIALE,
    vc.CLIENTE_NUMERO,
    vc.CLIENTE_NUMERO_CARICO_SCARICO,
    t.ANNO              AS ordine_anno,
    t.FILIALE           AS ordine_filiale,
    t.NUMERO            AS ordine_numero,
    t.NUMERO_CARICO_SCARICO,
  -- 3 campi target Pigliacelli
    RTRIM(t.CARICO_RAGIONE_SOCIALE)     AS caricatore,
    vcl.CLIENTE                         AS cliente_codice,
    RTRIM(b.RAGIONE_SOCIALE)            AS proprietario_merce,
    RTRIM(m.MERCE_CODICE)               AS merce_codice,
    RTRIM(m.MERCE_DESCRIZIONE)          AS merce_descrizione,
    LTRIM(RTRIM(ISNULL(m.MERCE_CODICE, '')))
        + CASE
            WHEN NULLIF(RTRIM(m.MERCE_CODICE), '') IS NOT NULL
             AND NULLIF(RTRIM(m.MERCE_DESCRIZIONE), '') IS NOT NULL
            THEN ' - '
            ELSE ''
          END
        + RTRIM(ISNULL(m.MERCE_DESCRIZIONE, '')) AS merce_label,
  -- contesto carico (opzionale)
    RTRIM(t.CARICO_LOCALITA)            AS carico_localita,
    RTRIM(t.SCARICO_RAGIONE_SOCIALE)    AS scarico_ragione_sociale,
    RTRIM(t.SCARICO_LOCALITA)           AS scarico_localita
FROM T2ViaggiVettori v
INNER JOIN T2ViaggiVettoriClienti vc
    ON vc.SOCIETA = v.SOCIETA
   AND vc.ANNO    = v.ANNO
   AND vc.NUMERO  = v.NUMERO
   AND vc.OPERAZIONE IN ('C', 'S')
INNER JOIN T2ViaggiClientiCarichiScarichi t
    ON t.SOCIETA = vc.SOCIETA
   AND t.ANNO    = vc.CLIENTE_ANNO
   AND t.FILIALE = vc.CLIENTE_FILIALE
   AND t.NUMERO  = vc.CLIENTE_NUMERO
   AND t.NUMERO_CARICO_SCARICO = vc.CLIENTE_NUMERO_CARICO_SCARICO
INNER JOIN T2ViaggiClienti vcl
    ON vcl.SOCIETA = t.SOCIETA
   AND vcl.ANNO    = t.ANNO
   AND vcl.FILIALE = t.FILIALE
   AND vcl.NUMERO  = t.NUMERO
INNER JOIN BaCliFor b
    ON b.SOCIETA = vcl.SOCIETA
   AND b.CLIENTE_FORNITORE = 'C'
   AND b.CODICE = vcl.CLIENTE
LEFT JOIN T2ViaggiClientiCarichiScarichiMerci m
    ON m.SOCIETA = t.SOCIETA
   AND m.ANNO    = t.ANNO
   AND m.FILIALE = t.FILIALE
   AND m.NUMERO  = t.NUMERO
   AND m.NUMERO_CARICO_SCARICO = t.NUMERO_CARICO_SCARICO
WHERE v.SOCIETA = 1
  AND t.ANNO >= 2026
ORDER BY t.ANNO DESC, t.FILIALE, t.NUMERO, t.NUMERO_CARICO_SCARICO, m.MERCE_CODICE;


-- -----------------------------------------------------------------------------
-- Query 2 — aggregata per stop ordine (merci concatenate; più vicina all'import tratta)
-- Richiede SQL Server 2017+ (STRING_AGG). Commentare se non disponibile.
-- -----------------------------------------------------------------------------
/*
SELECT TOP 100
    v.SOCIETA,
    v.ANNO              AS viaggio_vettore_anno,
    v.NUMERO            AS viaggio_vettore_numero,
    v.VETTORE           AS codice_vettore,
    vc.OPERAZIONE,
    vc.PROGRESSIVO,
    RTRIM(vc.LOCALITA)  AS stop_localita,
    t.ANNO,
    t.FILIALE,
    t.NUMERO,
    t.NUMERO_CARICO_SCARICO,
    RTRIM(t.CARICO_RAGIONE_SOCIALE)  AS caricatore,
    RTRIM(b.RAGIONE_SOCIALE)         AS proprietario_merce,
    STRING_AGG(
        LTRIM(RTRIM(ISNULL(m.MERCE_CODICE, '')))
        + CASE
            WHEN NULLIF(RTRIM(m.MERCE_CODICE), '') IS NOT NULL
             AND NULLIF(RTRIM(m.MERCE_DESCRIZIONE), '') IS NOT NULL
            THEN ' - '
            ELSE ''
          END
        + RTRIM(ISNULL(m.MERCE_DESCRIZIONE, '')),
        '; '
    ) WITHIN GROUP (ORDER BY m.MERCE_CODICE) AS merce_label
FROM T2ViaggiVettori v
INNER JOIN T2ViaggiVettoriClienti vc
    ON vc.SOCIETA = v.SOCIETA
   AND vc.ANNO    = v.ANNO
   AND vc.NUMERO  = v.NUMERO
   AND vc.OPERAZIONE = 'C'
INNER JOIN T2ViaggiClientiCarichiScarichi t
    ON t.SOCIETA = vc.SOCIETA
   AND t.ANNO    = vc.CLIENTE_ANNO
   AND t.FILIALE = vc.CLIENTE_FILIALE
   AND t.NUMERO  = vc.CLIENTE_NUMERO
   AND t.NUMERO_CARICO_SCARICO = vc.CLIENTE_NUMERO_CARICO_SCARICO
INNER JOIN T2ViaggiClienti vcl
    ON vcl.SOCIETA = t.SOCIETA
   AND vcl.ANNO    = t.ANNO
   AND vcl.FILIALE = t.FILIALE
   AND vcl.NUMERO  = t.NUMERO
INNER JOIN BaCliFor b
    ON b.SOCIETA = vcl.SOCIETA
   AND b.CLIENTE_FORNITORE = 'C'
   AND b.CODICE = vcl.CLIENTE
LEFT JOIN T2ViaggiClientiCarichiScarichiMerci m
    ON m.SOCIETA = t.SOCIETA
   AND m.ANNO    = t.ANNO
   AND m.FILIALE = t.FILIALE
   AND m.NUMERO  = t.NUMERO
   AND m.NUMERO_CARICO_SCARICO = t.NUMERO_CARICO_SCARICO
WHERE v.SOCIETA = 1
  AND t.ANNO >= 2026
GROUP BY
    v.SOCIETA, v.ANNO, v.NUMERO, v.VETTORE,
    vc.OPERAZIONE, vc.PROGRESSIVO, vc.LOCALITA,
    t.ANNO, t.FILIALE, t.NUMERO, t.NUMERO_CARICO_SCARICO,
    t.CARICO_RAGIONE_SOCIALE, b.RAGIONE_SOCIALE
ORDER BY t.ANNO DESC, t.FILIALE, t.NUMERO, t.NUMERO_CARICO_SCARICO;
*/


-- -----------------------------------------------------------------------------
-- Query 3 — verifica popolamento campi (conteggi)
-- -----------------------------------------------------------------------------
/*
SELECT
    COUNT(*) AS righe_cs,
    SUM(CASE WHEN NULLIF(RTRIM(CARICO_RAGIONE_SOCIALE), '') IS NOT NULL THEN 1 ELSE 0 END) AS con_caricatore,
    SUM(CASE WHEN NULLIF(RTRIM(SCARICO_RAGIONE_SOCIALE), '') IS NOT NULL THEN 1 ELSE 0 END) AS con_scarico_rs
FROM T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = 1
  AND ANNO >= 2026;

SELECT
    COUNT(*) AS righe_join_viaggio,
    SUM(CASE WHEN NULLIF(RTRIM(t.CARICO_RAGIONE_SOCIALE), '') IS NOT NULL THEN 1 ELSE 0 END) AS con_caricatore,
    SUM(CASE WHEN NULLIF(RTRIM(b.RAGIONE_SOCIALE), '') IS NOT NULL THEN 1 ELSE 0 END) AS con_proprietario,
    SUM(CASE WHEN NULLIF(RTRIM(m.MERCE_DESCRIZIONE), '') IS NOT NULL THEN 1 ELSE 0 END) AS con_merce
FROM T2ViaggiVettori v
INNER JOIN T2ViaggiVettoriClienti vc
    ON vc.SOCIETA = v.SOCIETA AND vc.ANNO = v.ANNO AND vc.NUMERO = v.NUMERO
   AND vc.OPERAZIONE IN ('C', 'S')
INNER JOIN T2ViaggiClientiCarichiScarichi t
    ON t.SOCIETA = vc.SOCIETA
   AND t.ANNO = vc.CLIENTE_ANNO
   AND t.FILIALE = vc.CLIENTE_FILIALE
   AND t.NUMERO = vc.CLIENTE_NUMERO
   AND t.NUMERO_CARICO_SCARICO = vc.CLIENTE_NUMERO_CARICO_SCARICO
INNER JOIN T2ViaggiClienti vcl
    ON vcl.SOCIETA = t.SOCIETA AND vcl.ANNO = t.ANNO
   AND vcl.FILIALE = t.FILIALE AND vcl.NUMERO = t.NUMERO
INNER JOIN BaCliFor b
    ON b.SOCIETA = vcl.SOCIETA AND b.CLIENTE_FORNITORE = 'C' AND b.CODICE = vcl.CLIENTE
LEFT JOIN T2ViaggiClientiCarichiScarichiMerci m
    ON m.SOCIETA = t.SOCIETA AND m.ANNO = t.ANNO AND m.FILIALE = t.FILIALE
   AND m.NUMERO = t.NUMERO AND m.NUMERO_CARICO_SCARICO = t.NUMERO_CARICO_SCARICO
WHERE v.SOCIETA = 1
  AND t.ANNO >= 2026;
*/

-- -----------------------------------------------------------------------------
-- Nota: se CLIENTE_ANNO / CLIENTE_FILIALE / ... non esistono su T2ViaggiVettoriClienti,
-- verificare i nomi colonna con:
--   SELECT TOP 5 * FROM T2ViaggiVettoriClienti WHERE SOCIETA = 1 AND OPERAZIONE = 'C';
-- Fallback (solo test, meno preciso su multi-stop):
--   t.ANNO = vc.ANNO AND t.FILIALE = vc.FILIALE AND t.NUMERO = vc.NUMERO
-- =============================================================================
