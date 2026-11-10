/*
    Sgam TEST — altra variazione tariffa per subvettore 99007 → contratto tipo 3.
    Tratta NAPOLI → TORINO (origine 990017), distinta da sgam_test_16 (BARI → MILANO).

    Prerequisiti:
      1. sgam_test_10 + sgam_test_11 gia eseguiti (viaggio 990017 NAPOLI→TORINO a 220)
      2. su Pigliacelli: wizard_complete = 1 e tratta NAPOLI/TORINO gia importata
         (job tratte dopo lo script 11; script 12/16 opzionali)

    Chiavi:
      VETTORE 99007
      origine  990017 | NAPOLI → TORINO | tariffa 220 | extra 30 | nolo 300
      nuovo   990047 | NAPOLI → TORINO | tariffa 255 | extra 30 | nolo 300

    Non modifica 990017. Clona le sue righe e cambia solo IMPORTO_UNITARIO → 255.
    Stesso percorso + importo diverso = hash diverso → aggiorna tratta (version++)
    e a fine run apre UN contratto tipo 3 (solo quella tratta).
    Il nolo cliente resta 300: non entra nell'hash e da solo non apre la variazione.

    Date: DATEADD(HOUR, 1, GETDATE()) — allinea a PHP/Rome (sync_date UAT).

    Flusso su Pigliacelli:
      1. questo script su Sgam
      2. check_new_trips_fast (o v2)
         -> tratta NAPOLI/TORINO aggiornata a 255 + UN contratto tipo 3

    Un solo batch, senza punto e virgola: DBeaver "Esegui script".
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @Codice int = 99007
DECLARE @NumeroOrigine int = 990017
DECLARE @NumeroNuovo int = 990047
DECLARE @TariffaNuova money = 255
DECLARE @Extra money = 30
DECLARE @NoloCliente money = 300
DECLARE @SyncNow datetime = DATEADD(HOUR, 1, GETDATE())
DECLARE @LocC varchar(50) = 'NAPOLI'
DECLARE @LocS varchar(50) = 'TORINO'

DECLARE @Filiale varchar(2)
DECLARE @FilialeCliente varchar(2)
DECLARE @NumeroClienteOrigine int
DECLARE @NumeroCarico smallint
DECLARE @TariffaOrigine money
DECLARE @cols nvarchar(max)
DECLARE @sql nvarchar(max)
DECLARE @ErrMsg nvarchar(2048)

SELECT
    @Filiale = FILIALE,
    @TariffaOrigine = IMPORTO_UNITARIO
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO = @NumeroOrigine
  AND VETTORE = @Codice
  AND TARIFFA = 'G'

IF @Filiale IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Manca il viaggio 2026 990017 del vettore 99007. Esegui prima sgam_test_10 e sgam_test_11.', 16, 1)
        RETURN
    END

IF @TariffaOrigine IS NULL OR ABS(@TariffaOrigine - @TariffaNuova) < 0.0001
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('La tariffa nuova e uguale a quella del viaggio 990017: non aprirebbe una variazione.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2BaseVettori
    WHERE SOCIETA = @Societa
      AND CODICE = @Codice
      AND ATTIVO = 'S'
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il subvettore 99007 non e attivo. Esegui prima sgam_test_10_nuovo_subvettore.sql.', 16, 1)
        RETURN
    END

SELECT TOP (1)
    @FilialeCliente = CLIENTE_FILIALE,
    @NumeroClienteOrigine = CLIENTE_NUMERO,
    @NumeroCarico = CLIENTE_NUMERO_CARICO_SCARICO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroOrigine
  AND OPERAZIONE = 'C'
  AND RTRIM(LOCALITA) = @LocC
  AND CLIENTE_NUMERO IS NOT NULL
  AND CLIENTE_NUMERO <> 0
ORDER BY PROGRESSIVO

IF @NumeroClienteOrigine IS NULL OR @NumeroCarico IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990017 non ha il carico NAPOLI collegato al viaggio cliente.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiVettoriClienti
    WHERE SOCIETA = @Societa
      AND ANNO = @Anno
      AND FILIALE = @Filiale
      AND NUMERO = @NumeroOrigine
      AND OPERAZIONE = 'S'
      AND RTRIM(LOCALITA) = @LocS
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990017 non ha lo scarico TORINO.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroNuovo
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia il numero 990047 nel 2026. Cambia @NumeroNuovo.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroNuovo
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia il numero 990047 nel 2026. Cambia @NumeroNuovo.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

/* Viaggio cliente: stesso nolo 300. Non e' lui ad aprire la variazione. */
IF OBJECT_ID('tempdb..#srcCli') IS NOT NULL DROP TABLE #srcCli
SELECT *
INTO #srcCli
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @NumeroClienteOrigine

UPDATE #srcCli
SET NUMERO = @NumeroNuovo,
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI 99007 VARIAZIONE NAPOLI',
    ORDINE_RIFERIMENTO = N'TEST-990047',
    IMPORTO_UNITARIO = @NoloCliente,
    IMPORTO_LORDO = @NoloCliente,
    IMPORTO_TOTALE = @NoloCliente,
    CONTROVALORE_IMPORTO_LORDO = @NoloCliente,
    CONTROVALORE_IMPORTO_TOTALE = @NoloCliente,
    MAGGIORAZIONE = 0,
    INSERT_DATA_ORA = @SyncNow,
    UPDATE_DATA_ORA = @SyncNow

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

SET @sql = N'INSERT INTO dbo.T2ViaggiClienti (' + @cols + N') SELECT ' + @cols + N' FROM #srcCli'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#srcCs') IS NOT NULL DROP TABLE #srcCs
SELECT *
INTO #srcCs
FROM dbo.T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @NumeroClienteOrigine

UPDATE #srcCs
SET NUMERO = @NumeroNuovo

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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichi (' + @cols + N') SELECT ' + @cols + N' FROM #srcCs'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#srcMerci') IS NOT NULL DROP TABLE #srcMerci
SELECT *
INTO #srcMerci
FROM dbo.T2ViaggiClientiCarichiScarichiMerci
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @NumeroClienteOrigine

UPDATE #srcMerci
SET NUMERO = @NumeroNuovo

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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #srcMerci'
EXEC sys.sp_executesql @sql

/* Viaggio subvettore: stesse localita NAPOLI/TORINO, tariffa 255. */
IF OBJECT_ID('tempdb..#srcVet') IS NOT NULL DROP TABLE #srcVet
SELECT *
INTO #srcVet
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroOrigine

UPDATE #srcVet
SET NUMERO = @NumeroNuovo,
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI 99007 VARIAZIONE NAPOLI',
    IMPORTO_UNITARIO = @TariffaNuova,
    IMPORTO_TOTALE = @TariffaNuova,
    CONTROVALORE_IMPORTO_TOTALE = @TariffaNuova,
    INSERT_DATA_ORA = @SyncNow,
    UPDATE_DATA_ORA = @SyncNow

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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettori (' + @cols + N') SELECT ' + @cols + N' FROM #srcVet'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#srcOp') IS NOT NULL DROP TABLE #srcOp
SELECT *
INTO #srcOp
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroOrigine

UPDATE #srcOp
SET NUMERO = @NumeroNuovo

UPDATE #srcOp
SET CLIENTE_NUMERO = @NumeroNuovo
WHERE OPERAZIONE IN ('C', 'S')
  AND CLIENTE_NUMERO = @NumeroClienteOrigine

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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #srcOp'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#srcAddebiti') IS NOT NULL DROP TABLE #srcAddebiti
SELECT *
INTO #srcAddebiti
FROM dbo.T2ViaggiVettoriAddebiti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroOrigine

IF NOT EXISTS (SELECT 1 FROM #srcAddebiti)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990017 non ha extra in T2ViaggiVettoriAddebiti.', 16, 1)
        RETURN
    END

UPDATE #srcAddebiti
SET NUMERO = @NumeroNuovo,
    IMPORTO_TOTALE = @Extra

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2ViaggiVettoriAddebiti')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriAddebiti (' + @cols + N') SELECT ' + @cols + N' FROM #srcAddebiti'
EXEC sys.sp_executesql @sql

    COMMIT TRANSACTION
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION
    SET @ErrMsg = LEFT(ERROR_MESSAGE(), 2048)
    RAISERROR(@ErrMsg, 16, 1)
    RETURN
END CATCH

SELECT
    v.ANNO,
    v.FILIALE,
    v.NUMERO,
    v.VETTORE,
    v.TARIFFA,
    v.IMPORTO_UNITARIO AS tariffa_subvettore,
    v.UPDATE_DATA_ORA
FROM dbo.T2ViaggiVettori v
WHERE v.SOCIETA = @Societa
  AND v.ANNO = @Anno
  AND v.NUMERO IN (@NumeroOrigine, @NumeroNuovo)
  AND v.VETTORE = @Codice
ORDER BY v.NUMERO

SELECT NUMERO, OPERAZIONE, RTRIM(LOCALITA) AS LOCALITA, CLIENTE_NUMERO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroNuovo
  AND OPERAZIONE IN ('C', 'S')
ORDER BY OPERAZIONE, PROGRESSIVO

SELECT COALESCE(SUM(IMPORTO_TOTALE), 0) AS extra_subvettore
FROM dbo.T2ViaggiVettoriAddebiti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @Filiale
  AND NUMERO = @NumeroNuovo

SELECT IMPORTO_TOTALE AS tariffa_cliente
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @NumeroNuovo
