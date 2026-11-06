/*
    Sgam TEST - secondo viaggio 990014 per subvettore 99003 (dopo script 06).
    Dopo sgam_test_05 + upsert. Richiede script 06 gia eseguito (cliente C 99003 presente).

    Chiavi: VETTORE 99003 | NUMERO viaggio/cliente 990014 | anno 2026.
    (990004 e' usato dallo script 06)

    Date viaggio: DATEADD(HOUR, 1, GETDATE()) — allinea a PHP/Rome (sync_date).
    Stesse localita BARI-MILANO dello script 06: utile al backfill tipo 1 con N viaggi;
    con fast, se la tratta esiste gia' → hash_gia_presente (non apre tipo 2).

    Flusso tipo 1 su Pigliacelli:
      1. anagrafica 99003 gia presente
      2. questo script (+ 06) crea i viaggi SGA
      3. UPDATE subvettori SET wizard_complete = 1 WHERE codice_sga = '99003'
         (deve avere ZERO tratte)
      4. check_new_trips_fast (o v2)

    Importi: tariffa 180 | extra 25 | tot 205 | tariffa_cliente 250 | BARI-MILANO
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @NuovoCodice int = 99003
DECLARE @NumeroViaggio int = 990014
DECLARE @NumeroCliente int = 990014
DECLARE @PivaCliente varchar(11) = '99003000002'
DECLARE @CfCliente varchar(20) = 'TSTCLI9900300003'
DECLARE @RagioneCliente nvarchar(100) = N'TEST PIGLIACELLI CLIENTE 99003'
DECLARE @TariffaSubvettore money = 180
DECLARE @NoloCliente money = 250
DECLARE @ExtraSubvettore money = 25

DECLARE @TplAnno smallint = 2026
DECLARE @TplFiliale varchar(2) = 'SE'
DECLARE @TplNumero int = 39567

DECLARE @FilialeVettore varchar(2)
DECLARE @FilialeCliente varchar(2)
DECLARE @TplNumeroCliente int
DECLARE @NumeroCarico smallint
DECLARE @TplClienteCodice int
DECLARE @cols nvarchar(max)
DECLARE @sql nvarchar(max)
DECLARE @ErrMsg nvarchar(2048)
DECLARE @ClienteGiaEsiste bit = 0
DECLARE @SyncNow datetime = DATEADD(HOUR, 1, GETDATE())

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2BaseVettori
    WHERE SOCIETA = @Societa
      AND CODICE = @NuovoCodice
      AND ATTIVO = 'S'
      AND FORNITORE_CLIFOR = 'F'
      AND FORNITORE_CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Manca il subvettore 99003 attivo. Esegui prima sgam_test_05_nuovo_subvettore.sql.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa
      AND CLIENTE_FORNITORE = 'F'
      AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Manca il fornitore BaCliFor 99003. Esegui prima lo script 05.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroViaggio
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia il numero 990014 nel 2026. Cambia @NumeroViaggio.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroCliente
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia il numero 990014 nel 2026. Cambia @NumeroCliente.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa AND CLIENTE_FORNITORE = 'C' AND CODICE = @NuovoCodice
)
    SET @ClienteGiaEsiste = 1

IF @ClienteGiaEsiste = 0 AND EXISTS (SELECT 1 FROM dbo.BaCliFor WHERE PARTITA_IVA = @PivaCliente)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA cliente 99003000002 gia presente. Cambia @PivaCliente.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa
      AND ANNO = @TplAnno
      AND FILIALE = @TplFiliale
      AND NUMERO = @TplNumero
      AND IMPORTO_UNITARIO > 0
      AND TARIFFA IN ('P', 'G', 'F')
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Viaggio modello 2026/SE/39567 non trovato. Aggiorna @TplAnno, @TplFiliale, @TplNumero.', 16, 1)
        RETURN
    END

SELECT @FilialeVettore = FILIALE
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @TplFiliale
  AND NUMERO = @TplNumero

SELECT TOP (1)
    @FilialeCliente = CLIENTE_FILIALE,
    @TplNumeroCliente = CLIENTE_NUMERO,
    @NumeroCarico = CLIENTE_NUMERO_CARICO_SCARICO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @TplFiliale
  AND NUMERO = @TplNumero
  AND OPERAZIONE = 'C'
  AND CLIENTE_NUMERO IS NOT NULL
  AND CLIENTE_NUMERO <> 0
  AND CLIENTE_NUMERO_CARICO_SCARICO IS NOT NULL
ORDER BY PROGRESSIVO

IF @TplNumeroCliente IS NULL OR @NumeroCarico IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio modello non ha un''operazione C collegata a un viaggio cliente.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiVettoriClienti
    WHERE SOCIETA = @Societa
      AND ANNO = @TplAnno
      AND FILIALE = @TplFiliale
      AND NUMERO = @TplNumero
      AND OPERAZIONE = 'S'
      AND NULLIF(RTRIM(LOCALITA), '') IS NOT NULL
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio modello non ha uno scarico con localita.', 16, 1)
        RETURN
    END

SELECT @TplClienteCodice = CLIENTE
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente
  AND CLIENTE_CLIFOR = 'C'
  AND IMPORTO_TOTALE > 0

IF @TplClienteCodice IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio cliente del modello non ha un nolo valorizzato.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa
      AND CLIENTE_FORNITORE = 'C'
      AND CODICE = @TplClienteCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il cliente anagrafico del modello non e'' in BaCliFor.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiClientiCarichiScarichi
    WHERE SOCIETA = @Societa
      AND ANNO = @Anno
      AND FILIALE = @FilialeCliente
      AND NUMERO = @TplNumeroCliente
      AND NUMERO_CARICO_SCARICO = @NumeroCarico
      AND NULLIF(RTRIM(CARICO_RAGIONE_SOCIALE), N'') IS NOT NULL
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il modello non ha il carico collegato all''operazione C.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiClientiCarichiScarichiMerci
    WHERE SOCIETA = @Societa
      AND ANNO = @Anno
      AND FILIALE = @FilialeCliente
      AND NUMERO = @TplNumeroCliente
      AND NUMERO_CARICO_SCARICO = @NumeroCarico
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il modello non ha merci sul carico collegato.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

/* Cliente committente: riusa C 99003 se gia creato dallo script 06. */
IF @ClienteGiaEsiste = 0
BEGIN

IF OBJECT_ID('tempdb..#t06CliFor') IS NOT NULL DROP TABLE #t06CliFor
SELECT *
INTO #t06CliFor
FROM dbo.BaCliFor
WHERE SOCIETA = @Societa
  AND CLIENTE_FORNITORE = 'C'
  AND CODICE = @TplClienteCodice

UPDATE #t06CliFor
SET CODICE = @NuovoCodice,
    CLIENTE_FORNITORE = 'C',
    RAGIONE_SOCIALE = @RagioneCliente,
    PARTITA_IVA = @PivaCliente,
    CODICE_FISCALE = @CfCliente,
    ATTIVO = 'S'

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.BaCliFor')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.BaCliFor (' + @cols + N') SELECT ' + @cols + N' FROM #t06CliFor'
EXEC sys.sp_executesql @sql

END

/* Viaggio cliente: IMPORTO_TOTALE e' il nolo che finisce in tariffa_cliente. */
IF OBJECT_ID('tempdb..#t06Cli') IS NOT NULL DROP TABLE #t06Cli
SELECT *
INTO #t06Cli
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t06Cli
SET NUMERO = @NumeroCliente,
    CLIENTE = @NuovoCodice,
    CLIENTE_CLIFOR = 'C',
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI',
    ORDINE_RIFERIMENTO = N'TEST-990014',
    IMPORTO_UNITARIO = @NoloCliente,
    IMPORTO_LORDO = @NoloCliente,
    IMPORTO_TOTALE = @NoloCliente,
    CONTROVALORE_IMPORTO_LORDO = @NoloCliente,
    CONTROVALORE_IMPORTO_TOTALE = @NoloCliente,
    MAGGIORAZIONE = 0,
    ORDINE_ROUTINE_ANNO = NULL,
    ORDINE_ROUTINE_FILIALE = NULL,
    ORDINE_ROUTINE_NUMERO = NULL,
    RAGGRUPPAMENTO_ANNO = NULL,
    RAGGRUPPAMENTO_FILIALE = NULL,
    RAGGRUPPAMENTO_NUMERO = NULL

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiClienti')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t06Cli'
EXEC sys.sp_executesql @sql

/* Carico/scarico del viaggio cliente: da qui esce il caricatore. */
IF OBJECT_ID('tempdb..#t06Cs') IS NOT NULL DROP TABLE #t06Cs
SELECT *
INTO #t06Cs
FROM dbo.T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t06Cs
SET NUMERO = @NumeroCliente

UPDATE #t06Cs
SET CARICO_RAGIONE_SOCIALE = N'TEST CARICATORE PIGLIACELLI',
    CARICO_LOCALITA = N'BARI',
    SCARICO_RAGIONE_SOCIALE = N'TEST DESTINATARIO PIGLIACELLI',
    SCARICO_LOCALITA = N'MILANO'
WHERE NUMERO_CARICO_SCARICO = @NumeroCarico

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiClientiCarichiScarichi')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichi (' + @cols + N') SELECT ' + @cols + N' FROM #t06Cs'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t06Merci') IS NOT NULL DROP TABLE #t06Merci
SELECT *
INTO #t06Merci
FROM dbo.T2ViaggiClientiCarichiScarichiMerci
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t06Merci
SET NUMERO = @NumeroCliente

UPDATE #t06Merci
SET MERCE_CODICE = 'TEST',
    MERCE_DESCRIZIONE = N'MERCE TEST PIGLIACELLI'
WHERE NUMERO_CARICO_SCARICO = @NumeroCarico

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiClientiCarichiScarichiMerci')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #t06Merci'
EXEC sys.sp_executesql @sql

/* Viaggio subvettore: date allineate a PHP (sync_date), non GETDATE() nudo. */
IF OBJECT_ID('tempdb..#t06Vet') IS NOT NULL DROP TABLE #t06Vet
SELECT *
INTO #t06Vet
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t06Vet
SET NUMERO = @NumeroViaggio,
    VETTORE = @NuovoCodice,
    FORNITORE = @NuovoCodice,
    FORNITORE_CLIFOR = 'F',
    TARIFFA = 'G',
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI',
    IMPORTO_UNITARIO = @TariffaSubvettore,
    IMPORTO_TOTALE = @TariffaSubvettore,
    CONTROVALORE_IMPORTO_TOTALE = @TariffaSubvettore,
    PARTENZA_DATA_ORA = '20261021 08:00:00',
    DATA = '20261021',
    DATA_COMPETENZA = '20261021',
    INSERT_DATA_ORA = @SyncNow,
    UPDATE_DATA_ORA = @SyncNow,
    VIAGGIO_COLLEGATO_ANNO = NULL,
    VIAGGIO_COLLEGATO_FILIALE = NULL,
    VIAGGIO_COLLEGATO_NUMERO = NULL,
    VIAGGIO_MASTER_ANNO = NULL,
    VIAGGIO_MASTER_FILIALE = NULL,
    VIAGGIO_MASTER_NUMERO = NULL

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiVettori')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiVettori (' + @cols + N') SELECT ' + @cols + N' FROM #t06Vet'
EXEC sys.sp_executesql @sql

/*
    Operazioni del viaggio.
    Il job costruisce la tratta solo con C e S.
    Gli altri progressivi (P, L, ...) restano, con il riferimento cliente svuotato,
    cosi il nolo non viene sommato due volte.
*/
IF OBJECT_ID('tempdb..#t06Op') IS NOT NULL DROP TABLE #t06Op
SELECT *
INTO #t06Op
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t06Op
SET NUMERO = @NumeroViaggio,
    CLIENTE_ANNO = NULL,
    CLIENTE_FILIALE = NULL,
    CLIENTE_NUMERO = NULL,
    CLIENTE_NUMERO_CARICO_SCARICO = NULL

UPDATE #t06Op
SET LOCALITA = 'BARI',
    CLIENTE_ANNO = @Anno,
    CLIENTE_FILIALE = @FilialeCliente,
    CLIENTE_NUMERO = @NumeroCliente,
    CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
WHERE OPERAZIONE = 'C'

UPDATE #t06Op
SET LOCALITA = 'MILANO',
    CLIENTE_ANNO = @Anno,
    CLIENTE_FILIALE = @FilialeCliente,
    CLIENTE_NUMERO = @NumeroCliente,
    CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
WHERE OPERAZIONE = 'S'

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiVettoriClienti')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t06Op'
EXEC sys.sp_executesql @sql

/* Extra subvettore: il job fa la SUM di IMPORTO_TOTALE. */
INSERT INTO dbo.T2ViaggiVettoriAddebiti
    (SOCIETA, ANNO, FILIALE, NUMERO, PROGRESSIVO, AUTOMATICA, IMPORTO_TOTALE)
VALUES
    (@Societa, @Anno, @FilialeVettore, @NumeroViaggio, 1, 'N', @ExtraSubvettore)

    COMMIT TRANSACTION
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION
    SET @ErrMsg = LEFT(ERROR_MESSAGE(), 2048)
    RAISERROR(@ErrMsg, 16, 1)
    RETURN
END CATCH

/* Stessi filtri del job tratte. */
SELECT
    v.ANNO,
    v.FILIALE,
    v.NUMERO,
    v.VETTORE,
    v.TARIFFA,
    v.IMPORTO_UNITARIO AS tariffa_subvettore,
    v.UPDATE_DATA_ORA
FROM dbo.T2ViaggiVettori v
INNER JOIN dbo.T2BaseVettori t
    ON t.CODICE = v.VETTORE
   AND t.SOCIETA = v.SOCIETA
   AND t.ATTIVO = 'S'
WHERE v.SOCIETA = @Societa
  AND v.ANNO = @Anno
  AND v.NUMERO = @NumeroViaggio

SELECT OPERAZIONE, LOCALITA, CLIENTE_ANNO, CLIENTE_FILIALE, CLIENTE_NUMERO, CLIENTE_NUMERO_CARICO_SCARICO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO = @NumeroViaggio
  AND OPERAZIONE IN ('C', 'S')
ORDER BY OPERAZIONE, PROGRESSIVO

SELECT SUM(vcl.IMPORTO_TOTALE) AS tariffa_cliente
FROM (
    SELECT DISTINCT CLIENTE_ANNO, CLIENTE_FILIALE, CLIENTE_NUMERO
    FROM dbo.T2ViaggiVettoriClienti
    WHERE SOCIETA = @Societa
      AND ANNO = @Anno
      AND NUMERO = @NumeroViaggio
      AND CLIENTE_NUMERO IS NOT NULL
      AND CLIENTE_NUMERO <> 0
) vc
INNER JOIN dbo.T2ViaggiClienti vcl
    ON vcl.SOCIETA = @Societa
   AND vcl.ANNO = vc.CLIENTE_ANNO
   AND vcl.FILIALE = vc.CLIENTE_FILIALE
   AND vcl.NUMERO = vc.CLIENTE_NUMERO

SELECT COALESCE(SUM(IMPORTO_TOTALE), 0) AS extra_subvettore
FROM dbo.T2ViaggiVettoriAddebiti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO = @NumeroViaggio

SELECT
    RTRIM(cs.CARICO_RAGIONE_SOCIALE) AS caricatore,
    RTRIM(b.RAGIONE_SOCIALE) AS proprietario_merce,
    RTRIM(m.MERCE_CODICE) AS merce_codice,
    RTRIM(m.MERCE_DESCRIZIONE) AS merce_descrizione
FROM dbo.T2ViaggiVettoriClienti vc
INNER JOIN dbo.T2ViaggiClientiCarichiScarichi cs
    ON cs.SOCIETA = vc.SOCIETA
   AND cs.ANNO = vc.CLIENTE_ANNO
   AND cs.FILIALE = vc.CLIENTE_FILIALE
   AND cs.NUMERO = vc.CLIENTE_NUMERO
   AND cs.NUMERO_CARICO_SCARICO = vc.CLIENTE_NUMERO_CARICO_SCARICO
LEFT JOIN dbo.T2ViaggiClienti vcl
    ON vcl.SOCIETA = cs.SOCIETA
   AND vcl.ANNO = cs.ANNO
   AND vcl.FILIALE = cs.FILIALE
   AND vcl.NUMERO = cs.NUMERO
LEFT JOIN dbo.BaCliFor b
    ON b.SOCIETA = vcl.SOCIETA
   AND b.CLIENTE_FORNITORE = 'C'
   AND b.CODICE = vcl.CLIENTE
LEFT JOIN dbo.T2ViaggiClientiCarichiScarichiMerci m
    ON m.SOCIETA = cs.SOCIETA
   AND m.ANNO = cs.ANNO
   AND m.FILIALE = cs.FILIALE
   AND m.NUMERO = cs.NUMERO
   AND m.NUMERO_CARICO_SCARICO = cs.NUMERO_CARICO_SCARICO
WHERE vc.SOCIETA = @Societa
  AND vc.ANNO = @Anno
  AND vc.NUMERO = @NumeroViaggio
  AND vc.OPERAZIONE = 'C'
ORDER BY vc.PROGRESSIVO, m.MERCE_CODICE
