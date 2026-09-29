<?php
/**
 * Slot ANGA/RENTRI aziendali (subvettore_mezzo_id e autista vuoti).
 *
 * Unione dei flag has_cat_trasp_rifiuti_1/4/5 su tutti i mezzi del subvettore:
 * una Autorizzazione + una Ricevuta per ogni categoria presente almeno una volta,
 * e una Iscrizione RENTRI + una Ricevuta RENTRI se c'è almeno una categoria.
 * Nessuna categoria → nessuno slot ANGA/RENTRI.
 *
 * Categoria sparita da tutti i mezzi:
 * - slot senza file → DELETE
 * - slot con file già caricato → si lascia (lo cancella il subvettore)
 *
 * Non copia i file già legati a un mezzo. Non imposta data_scadenza.
 * I tipi usati diventano mandatory=1: lo step documenti richiede file e scadenza.
 *
 * La chiamano onAfterInsert e onAfterUpdate di form_subvettori_mezzi (anche admin).
 * form_documenti è la form di admin e operatori: non va sincronizzata lì.
 * Copia della funzione anche in onAfterInsert / onAfterUpdate del mezzo.
 */

if (!function_exists('anga_rentri_sync_slots')) {
    function anga_rentri_sync_slots($subId)
    {
        $subId = (int)$subId;
        $changed = 0;
        if ($subId <= 0) {
            return 0;
        }

        sc_lookup(rsAngaSyncFlags, "
            SELECT
                MAX(CASE WHEN COALESCE(has_cat_trasp_rifiuti_1, 0) = 1 THEN 1 ELSE 0 END),
                MAX(CASE WHEN COALESCE(has_cat_trasp_rifiuti_4, 0) = 1 THEN 1 ELSE 0 END),
                MAX(CASE WHEN COALESCE(has_cat_trasp_rifiuti_5, 0) = 1 THEN 1 ELSE 0 END)
            FROM subvettori_mezzi
            WHERE subvettore_id = $subId
        ", 'pigliacelli');

        $need1 = (isset({rsAngaSyncFlags[0][0]}) && (int){rsAngaSyncFlags[0][0]} === 1) ? 1 : 0;
        $need4 = (isset({rsAngaSyncFlags[0][1]}) && (int){rsAngaSyncFlags[0][1]} === 1) ? 1 : 0;
        $need5 = (isset({rsAngaSyncFlags[0][2]}) && (int){rsAngaSyncFlags[0][2]} === 1) ? 1 : 0;
        $needR = ($need1 === 1 || $need4 === 1 || $need5 === 1) ? 1 : 0;

        $slots = array(
            array('Autorizzazione ANGA Cat.1', '', $need1),
            array('Ricevuta pagamento ANGA Cat.1', '', $need1),
            array('Autorizzazione ANGA Cat.4', '', $need4),
            array('Ricevuta pagamento ANGA Cat.4', '', $need4),
            array('Autorizzazione ANGA Cat.5', '', $need5),
            array('Ricevuta pagamento ANGA Cat.5', '', $need5),
            array('Iscrizione RENTRI', 'Iscrizione RENTRI Cat.1', $needR),
            array('Ricevuta pagamento RENTRI', 'Ricevuta pagamento RENTRI Cat.1', $needR),
        );

        $loginSql = str_replace("'", "''", trim((string)[usr_login]));

        foreach ($slots as $slot) {
            $nomeSql = str_replace("'", "''", $slot[0]);
            sc_lookup(rsAngaSyncTipo, "
                SELECT id FROM tipi_documento
                WHERE LOWER(TRIM(nome)) = LOWER(TRIM('$nomeSql'))
                ORDER BY id ASC
                LIMIT 1
            ", 'pigliacelli');
            $canonId = (isset({rsAngaSyncTipo[0][0]}) && (int){rsAngaSyncTipo[0][0]} > 0)
                ? (int){rsAngaSyncTipo[0][0]} : 0;

            $fallId = 0;
            if ($slot[1] !== '') {
                $fallSql = str_replace("'", "''", $slot[1]);
                sc_lookup(rsAngaSyncTipoB, "
                    SELECT id FROM tipi_documento
                    WHERE LOWER(TRIM(nome)) = LOWER(TRIM('$fallSql'))
                    ORDER BY id ASC
                    LIMIT 1
                ", 'pigliacelli');
                $fallId = (isset({rsAngaSyncTipoB[0][0]}) && (int){rsAngaSyncTipoB[0][0]} > 0)
                    ? (int){rsAngaSyncTipoB[0][0]} : 0;
            }

            $ids = array();
            if ($canonId > 0) {
                $ids[] = $canonId;
            }
            if ($fallId > 0 && $fallId !== $canonId) {
                $ids[] = $fallId;
            }
            if (empty($ids)) {
                continue;
            }

            $tipoId = ($canonId > 0) ? $canonId : $fallId;
            $idList = implode(',', $ids);
            $need = (int)$slot[2];

            if ($need === 1) {
                sc_exec_sql("
                    UPDATE tipi_documento
                    SET mandatory = 1
                    WHERE id = $tipoId
                      AND COALESCE(mandatory, 0) <> 1
                ", 'pigliacelli');

                sc_lookup(rsAngaSyncSlot, "
                    SELECT id
                    FROM documenti
                    WHERE subvettore_id = $subId
                      AND tipo_documento_id IN ($idList)
                      AND (subvettore_autista_id IS NULL OR subvettore_autista_id = 0)
                      AND (subvettore_mezzo_id IS NULL OR subvettore_mezzo_id = 0)
                    LIMIT 1
                ", 'pigliacelli');
                if (!(isset({rsAngaSyncSlot[0][0]}) && (int){rsAngaSyncSlot[0][0]} > 0)) {
                    sc_exec_sql("
                        INSERT INTO documenti (
                            tipo_documento_id, subvettore_id, login, stato_documento_id
                        ) VALUES (
                            $tipoId, $subId, '$loginSql', 1
                        )
                    ", 'pigliacelli');
                    $changed++;
                }
            } else {
                sc_lookup(rsAngaSyncEmpty, "
                    SELECT COUNT(*)
                    FROM documenti
                    WHERE subvettore_id = $subId
                      AND tipo_documento_id IN ($idList)
                      AND (subvettore_autista_id IS NULL OR subvettore_autista_id = 0)
                      AND (subvettore_mezzo_id IS NULL OR subvettore_mezzo_id = 0)
                      AND (file IS NULL OR TRIM(file) = '')
                ", 'pigliacelli');
                $nEmpty = isset({rsAngaSyncEmpty[0][0]}) ? (int){rsAngaSyncEmpty[0][0]} : 0;
                if ($nEmpty > 0) {
                    sc_exec_sql("
                        DELETE FROM documenti
                        WHERE subvettore_id = $subId
                          AND tipo_documento_id IN ($idList)
                          AND (subvettore_autista_id IS NULL OR subvettore_autista_id = 0)
                          AND (subvettore_mezzo_id IS NULL OR subvettore_mezzo_id = 0)
                          AND (file IS NULL OR TRIM(file) = '')
                    ", 'pigliacelli');
                    $changed += $nEmpty;
                }
            }
        }

        return $changed;
    }
}
