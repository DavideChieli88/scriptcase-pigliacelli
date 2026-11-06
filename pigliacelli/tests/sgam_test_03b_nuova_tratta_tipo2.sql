/*
    Sgam TEST — nuova tratta (contratto tipo 2) per il subvettore 99001.
    Eseguire a mano su Sgam, dopo sgam_test_01 + sgam_test_02
    e dopo che il job tratte ha gia importato il viaggio 990001
    (wizard_complete = 1 e almeno una tratta BARI/MILANO).

    Non tocca 990001 ne la variazione 990002. Inserisce 2026/SE/990011
    (non 990003: riservato a sgam_test_06 per vettore 99003)
    copiando le righe del viaggio test, con LOCALITA diverse:
      vettore 99001
      carico NAPOLI | scarico TORINO
      tariffa subvettore 195 | extra 30 | nolo cliente 270

    Il job vede una tratta nuova (hash diverso per localita/importo) e,
    avendo gia tratte + tipo 1, accoda un contratto tipo 2
    (appendice solo della tratta nuova).

    Date: DATEADD(HOUR, 1, GETDATE()) — su UAT GETDATE() SQL Server e ~1h
    indietro rispetto a PHP/Rome; senza +1h il viaggio resta fuori finestra sync.
    Se gli orologi sono allineati, togli il DATEADD e lascia GETDATE().

    Atteso in Pigliacelli sul subvettore 99001:
      nuova tratta NAPOLI / TORINO
      tariffa 195,00 | extra 30,00 | totale 225,00 | tariffa_cliente 270,00
      contratto tipo 2, stato Da inviare al subvettore

    Sul Pigliacelli, dopo questo script: solo il job tratte (fast o v2).
*/


-- Un solo batch, senza punto e virgola: DBeaver "Esegui script"
SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @Codice int = 99001
DECLARE @NumeroOrigine int = 990001
DECLARE @NumeroNuovo int = 990011
DECLARE @TariffaNuova money = 195
DECLARE @Extra money = 30
DECLARE @NoloCliente money = 270
DECLARE @LocC varchar(50) = 'NAPOLI'
DECLARE @LocS varchar(50) = 'TORINO'

DECLARE @Filiale varchar(2)
DECLARE @FilialeCliente varchar(2)
DECLARE @NumeroClienteOrigine int
DECLARE @NumeroCarico smallint
DECLARE @cols nvarchar(max)
DECLARE @sql nvarchar(max)
DECLARE @ErrMsg nvarchar(2048)
DECLARE @SyncNow datetime = DATEADD(HOUR, 1, GETDATE())

SELECT @Filiale = FILIALE
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO = @NumeroOrigine
  AND VETTORE = @Codice
  AND TARIFFA = 'G'

IF @Filiale IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Manca il viaggio 2026 990001 del vettore 99001. Esegui prima gli script 1 e 2.', 16, 1)
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
        RAISERROR('Il subvettore 99001 non e attivo. Esegui prima lo script 1.', 16, 1)
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
  AND RTRIM(LOCALITA) = 'BARI'
  AND CLIENTE_NUMERO IS NOT NULL
  AND CLIENTE_NUMERO <> 0
ORDER BY PROGRESSIVO

IF @NumeroClienteOrigine IS NULL OR @NumeroCarico IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990001 non ha il carico BARI collegato al viaggio cliente.', 16, 1)
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
      AND RTRIM(LOCALITA) = 'MILANO'
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990001 non ha lo scarico MILANO.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroNuovo
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia il numero 990011 nel 2026.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroNuovo
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia il numero 990011 nel 2026.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

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
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI NUOVA TRATTA TIPO2',
    ORDINE_RIFERIMENTO = N'TEST-990011',
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

UPDATE #srcCs
SET CARICO_LOCALITA = @LocC,
    SCARICO_LOCALITA = @LocS
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
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI NUOVA TRATTA TIPO2',
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

UPDATE #srcOp
SET LOCALITA = @LocC
WHERE OPERAZIONE = 'C'

UPDATE #srcOp
SET LOCALITA = @LocS
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
        RAISERROR('Il viaggio 990001 non ha extra in T2ViaggiVettoriAddebiti.', 16, 1)
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
    v.INSERT_DATA_ORA,
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
