-- Copia i permessi applicazione da sec_groups_apps del gruppo 1 al gruppo 5 (Committente).
-- Il gruppo 5 deve esistere già in sec_groups (creato da ScriptCase).
-- Le app presenti solo sul gruppo 5 restano. Quelle in comune prendono i permessi del gruppo 1.
-- Non tocca il gruppo 4.

INSERT INTO sec_groups_apps (
    group_id,
    app_name,
    priv_access,
    priv_insert,
    priv_delete,
    priv_update,
    priv_export,
    priv_print
)
SELECT
    5,
    g1.app_name,
    g1.priv_access,
    g1.priv_insert,
    g1.priv_delete,
    g1.priv_update,
    g1.priv_export,
    g1.priv_print
FROM sec_groups_apps g1
WHERE g1.group_id = 1
ON DUPLICATE KEY UPDATE
    priv_access = VALUES(priv_access),
    priv_insert = VALUES(priv_insert),
    priv_delete = VALUES(priv_delete),
    priv_update = VALUES(priv_update),
    priv_export = VALUES(priv_export),
    priv_print  = VALUES(priv_print);

-- Controllo: ogni app del gruppo 1 deve risultare ok sul gruppo 5.
SELECT
    g1.app_name,
    g1.priv_access AS access_1,
    g5.priv_access AS access_5,
    CASE
        WHEN g5.app_name IS NULL THEN 'manca sul gruppo 5'
        WHEN NOT (
            g1.priv_access <=> g5.priv_access
            AND g1.priv_insert <=> g5.priv_insert
            AND g1.priv_delete <=> g5.priv_delete
            AND g1.priv_update <=> g5.priv_update
            AND g1.priv_export <=> g5.priv_export
            AND g1.priv_print  <=> g5.priv_print
        ) THEN 'permessi diversi'
        ELSE 'ok'
    END AS esito
FROM sec_groups_apps g1
LEFT JOIN sec_groups_apps g5
    ON g5.group_id = 5
   AND g5.app_name = g1.app_name
WHERE g1.group_id = 1
ORDER BY esito DESC, g1.app_name;


UPDATE `sec_users_groups` SET `group_id` = '5' WHERE `sec_users_groups`.`login` = 'pigliacelli.marcello@pigliacelli.it' AND `sec_users_groups`.`group_id` = 4;