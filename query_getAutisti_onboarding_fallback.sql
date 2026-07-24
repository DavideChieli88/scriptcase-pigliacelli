-- Query di riferimento per getAutisti() nel report Scriptcase nuovo_contratto_vettore
-- Sostituire la SELECT attuale (o estenderla) con questa logica.
--
-- Parametri:
--   :subvettore_contratto_id  = PK subvettori_contratti (subvector nel report)
--   :subvettore_id            = subvettori.id (da JOIN subvettori_contratti)
--
-- Ordine colonne allineato all'uso in nuovo_contratto_vettore ($d[1] nominativo, ... $d[13] cat_5)

SELECT
    sa.id,
    sa.nominativo,
    sa.scadenza_patente,
    sa.scadenza_cqc,
    sa.targhe_mezzi,
    sa.anno_immatricolazione,
    sa.telaio,
    sa.marca_veicolo,
    sa.tipo_veicolo,
    sa.scadenza_carta_circolazione,
    sa.scadenza_assicurazioni,
    sa.has_cat_trasp_rifiuti_1,
    sa.has_cat_trasp_rifiuti_4,
    sa.has_cat_trasp_rifiuti_5
FROM subvettori_autisti sa
WHERE sa.subvettore_contratto_id = :subvettore_contratto_id
   OR (
        sa.subvettore_id = :subvettore_id
        AND (sa.subvettore_contratto_id IS NULL OR sa.subvettore_contratto_id = 0)
      )
ORDER BY sa.id;

-- Risoluzione subvettore_id da subvettore_contratto_id (se il report ha solo subvector):
-- SELECT subvettore_id FROM subvettori_contratti WHERE id = :subvettore_contratto_id LIMIT 1;
