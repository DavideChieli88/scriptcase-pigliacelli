-- Backfill data_scadenza su documenti (tipi 18/20/21)
-- da colonne subvettori_autisti (già valorizzate in form).
-- Idempotente: aggiorna solo se documenti.data_scadenza e' vuota
-- e la colonna autista ha una data.

UPDATE documenti d
INNER JOIN subvettori_autisti sa ON sa.id = d.subvettore_autista_id
SET d.data_scadenza = sa.scadenza_idoneita_sanitaria,
    d.updated_at = NOW()
WHERE d.tipo_documento_id = 18
  AND sa.scadenza_idoneita_sanitaria IS NOT NULL
  AND sa.scadenza_idoneita_sanitaria <> '0000-00-00'
  AND (
      d.data_scadenza IS NULL
      OR d.data_scadenza = '0000-00-00'
      OR d.data_scadenza = '0000-00-00 00:00:00'
  );

UPDATE documenti d
INNER JOIN subvettori_autisti sa ON sa.id = d.subvettore_autista_id
SET d.data_scadenza = sa.scadenza_formazione_sicurezza,
    d.updated_at = NOW()
WHERE d.tipo_documento_id = 20
  AND sa.scadenza_formazione_sicurezza IS NOT NULL
  AND sa.scadenza_formazione_sicurezza <> '0000-00-00'
  AND (
      d.data_scadenza IS NULL
      OR d.data_scadenza = '0000-00-00'
      OR d.data_scadenza = '0000-00-00 00:00:00'
  );

UPDATE documenti d
INNER JOIN subvettori_autisti sa ON sa.id = d.subvettore_autista_id
SET d.data_scadenza = sa.scadenza_dpi_iii_categoria,
    d.updated_at = NOW()
WHERE d.tipo_documento_id = 21
  AND sa.scadenza_dpi_iii_categoria IS NOT NULL
  AND sa.scadenza_dpi_iii_categoria <> '0000-00-00'
  AND (
      d.data_scadenza IS NULL
      OR d.data_scadenza = '0000-00-00'
      OR d.data_scadenza = '0000-00-00 00:00:00'
  );

-- Verifica
SELECT d.id, d.tipo_documento_id, td.nome, d.subvettore_autista_id, d.data_scadenza
FROM documenti d
INNER JOIN tipi_documento td ON td.id = d.tipo_documento_id
WHERE d.tipo_documento_id IN (18, 20, 21)
  AND d.subvettore_autista_id IS NOT NULL
  AND d.subvettore_autista_id <> 0
ORDER BY d.subvettore_autista_id, d.tipo_documento_id;
