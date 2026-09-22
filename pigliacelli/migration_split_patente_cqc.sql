-- Separa Patente (tipo 19) e CQC (nuovo tipo).
-- Eseguire su pigliacelli. Poi rigenerare form_subvettori_autisti_wizard.

UPDATE tipi_documento
SET nome = 'Patenti autisti (fronte/retro)'
WHERE id = 19
  AND (
        LOWER(TRIM(nome)) LIKE '%patenti%e cqc%'
     OR LOWER(TRIM(nome)) = LOWER('Patenti e CQC autisti (fronte/retro)')
     OR LOWER(TRIM(nome)) LIKE 'patenti e cqc%'
  );

INSERT INTO tipi_documento (nome, mandatory, from_preset, is_readonly, flag_possesso)
SELECT 'CQC autisti (fronte/retro)', 1, 0, 0, 0 FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM tipi_documento
    WHERE LOWER(TRIM(nome)) = LOWER('CQC autisti (fronte/retro)')
);

SET @cqc_id = (
    SELECT id FROM tipi_documento
    WHERE LOWER(TRIM(nome)) = LOWER('CQC autisti (fronte/retro)')
    LIMIT 1
);

-- Seconda riga tipo 19 per autista (era la CQC) → nuovo tipo
UPDATE documenti d
INNER JOIN (
    SELECT subvettore_autista_id, MIN(id) AS first_id
    FROM documenti
    WHERE tipo_documento_id = 19
      AND COALESCE(subvettore_autista_id, 0) > 0
    GROUP BY subvettore_autista_id
) f ON f.subvettore_autista_id = d.subvettore_autista_id
SET d.tipo_documento_id = @cqc_id
WHERE d.tipo_documento_id = 19
  AND d.id <> f.first_id
  AND COALESCE(d.subvettore_autista_id, 0) > 0
  AND @cqc_id IS NOT NULL
  AND @cqc_id > 0;

SELECT id, nome, mandatory FROM tipi_documento
WHERE id = 19 OR LOWER(TRIM(nome)) LIKE '%cqc%autist%'
ORDER BY id;
