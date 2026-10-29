-- Alert mancanti: permesso, CQC, DURF, certificati ISO/SQAS/diagnosi.
-- Non tocca REN (2), Albo (4), Iscrizione RENTRI (13): senza alert per specifica.
-- Idempotente: inserisce solo se la regola non c'e' gia'.

INSERT INTO tipi_documento_alert
    (tipo_documento_id, rule_type, days_before, fixed_md, dest_scope, active, note)
SELECT s.tipo_documento_id, s.rule_type, s.days_before, s.fixed_md, s.dest_scope, 1, s.note
FROM (
    -- 30 Permesso di soggiorno (come patenti: 14 gg + giorno)
    SELECT 30 AS tipo_documento_id, 'days_before' AS rule_type, 14 AS days_before, NULL AS fixed_md, 'sub' AS dest_scope, '14 gg prima' AS note
    UNION ALL SELECT 30, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 38 CQC autisti
    UNION ALL SELECT 38, 'days_before', 14, NULL, 'sub', '14 gg prima'
    UNION ALL SELECT 38, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 39 DURF (quadriennale)
    UNION ALL SELECT 39, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 39, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 40 Certificato ISO 9001
    UNION ALL SELECT 40, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 40, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 41 Certificato ISO 14001
    UNION ALL SELECT 41, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 41, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 42 Certificato ISO 45001
    UNION ALL SELECT 42, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 42, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 43 Certificato SQAS
    UNION ALL SELECT 43, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 43, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 44 Diagnosi energetica
    UNION ALL SELECT 44, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 44, 'days_before', 0, NULL, 'both', 'giorno scadenza'
    -- 45 Attestazione invio ENEA
    UNION ALL SELECT 45, 'days_before', 30, NULL, 'sub', '30 gg prima'
    UNION ALL SELECT 45, 'days_before', 0, NULL, 'both', 'giorno scadenza'
) s
INNER JOIN tipi_documento td ON td.id = s.tipo_documento_id
WHERE NOT EXISTS (
    SELECT 1
    FROM tipi_documento_alert a
    WHERE a.tipo_documento_id = s.tipo_documento_id
      AND a.rule_type = s.rule_type
      AND (
            (s.rule_type = 'days_before' AND a.days_before <=> s.days_before)
         OR (s.rule_type = 'fixed_md' AND a.fixed_md <=> s.fixed_md)
      )
);

-- Verifica
SELECT a.tipo_documento_id, td.nome, a.rule_type, a.days_before, a.dest_scope, a.note
FROM tipi_documento_alert a
JOIN tipi_documento td ON td.id = a.tipo_documento_id
WHERE a.tipo_documento_id IN (30, 38, 39, 40, 41, 42, 43, 44, 45)
ORDER BY a.tipo_documento_id, a.days_before DESC;
