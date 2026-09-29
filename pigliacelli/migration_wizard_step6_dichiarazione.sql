-- Step wizard. Eseguire una sola volta.
-- 1 anagrafica, 2 autisti, 3 mezzi, 4 dichiarazione, 5 documenti upload, 6 firma verdi.
-- Chi era sui documenti (4) passa al 5. Chi era sulla firma (5) passa al 6.

UPDATE subvettori
SET wizard_step = wizard_step + 1
WHERE wizard_complete = 0
  AND wizard_step IN (4, 5);

ALTER TABLE subvettori
    MODIFY COLUMN wizard_step TINYINT UNSIGNED NOT NULL DEFAULT 1
    COMMENT '1=anagrafica 2=autisti 3=mezzi 4=dichiarazione 5=documenti upload 6=firma verdi 0=completato';
