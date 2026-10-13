-- White list (tipi_documento id 9): documento obbligatorio.
-- Si carica il certificato, oppure l'istanza di iscrizione con la ricevuta PEC.
-- Via la dicitura "se iscritto" / "se non iscritti". Niente flag "in possesso".

UPDATE tipi_documento
SET
    nome = 'Certificato White list oppure istanza di iscrizione con ricevuta PEC',
    mandatory = 1,
    from_preset = 1,
    flag_possesso = 0,
    is_readonly = 0
WHERE id = 9;

SELECT id, nome, mandatory, from_preset, flag_possesso, is_readonly
FROM tipi_documento
WHERE id = 9;
