/*
    Sgam TEST — variazione della tratta gia creata dagli script 1 e 2.
    Eseguire a mano su Sgam, dopo sgam_test_02_nuovo_viaggio.sql
    e dopo che il job tratte ha gia importato il viaggio 990001 in Pigliacelli.

    Non modifica il viaggio 2026/SE/990001. Ne inserisce un altro,
    2026/SE/990002, copiando le righe del test:
      stesso vettore 99001, carico BARI, scarico MILANO, extra 25, nolo 250
      tariffa subvettore 210 invece di 180

    Il job tratte confronta carico + scarico + codice vettore + importo unitario.
    L'importo diverso cambia l'hash. La localita e' la stessa, quindi aggiorna
    la tratta gia importata (version 2) e accoda un contratto di variazione, tipo 3.
    Il nolo cliente non entra nell'hash e da solo non apre la variazione:
    qui resta 250, cosi si vede che a muovere il contratto e' la tariffa 210.

    Atteso in Pigliacelli, sulla tratta BARI / MILANO del subvettore 99001:
      tariffa 210,00 | extra 25,00 | totale 235,00 | tariffa_cliente 250,00
      contratto tipo 3, stato Da inviare al subvettore

    Sul Pigliacelli, dopo questo script: solo il job tratte.
    Il subvettore deve avere gia wizard_complete = 1 e almeno una tratta,
    altrimenti il viaggio nuovo resta in attesa del primo contratto e non varia nulla.
*/


-- Un solo batch, senza punto e virgola: DBeaver "Esegui script"
-- altrimenti manda ogni istruzione da sola e SQL Server non vede piu le variabili.
SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @Codice int = 99001
DECLARE @NumeroOrigine int = 990001
DECLARE @NumeroNuovo int = 990002
DECLARE @TariffaNuova money = 210
DECLARE @Extra money = 25
DECLARE @NoloCliente money = 250

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
        RAISERROR('Manca il viaggio 2026 990001 del vettore 99001. Esegui prima gli script 1 e 2.', 16, 1)
        RETURN
    END

IF @TariffaOrigine IS NULL OR ABS(@TariffaOrigine - @TariffaNuova) < 0.0001
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('La tariffa nuova e uguale a quella del viaggio 990001: non aprirebbe una variazione.', 16, 1)
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
        RAISERROR('T2ViaggiVettori ha gia il numero 990002 nel 2026.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroNuovo
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia il numero 990002 nel 2026.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

/* Viaggio cliente: stesso nolo 250. Non e' lui ad aprire la variazione. */
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
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI VARIAZIONE',
    ORDINE_RIFERIMENTO = N'TEST-990002',
    IMPORTO_UNITARIO = @NoloCliente,
    IMPORTO_LORDO = @NoloCliente,
    IMPORTO_TOTALE = @NoloCliente,
    CONTROVALORE_IMPORTO_LORDO = @NoloCliente,
    CONTROVALORE_IMPORTO_TOTALE = @NoloCliente,
    MAGGIORAZIONE = 0,
    INSERT_DATA_ORA = GETDATE(),
    UPDATE_DATA_ORA = GETDATE()

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

/* Viaggio subvettore: stesse localita, tariffa 210. UPDATE_DATA_ORA = adesso. */
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
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI VARIAZIONE',
    IMPORTO_UNITARIO = @TariffaNuova,
    IMPORTO_TOTALE = @TariffaNuova,
    CONTROVALORE_IMPORTO_TOTALE = @TariffaNuova,
    INSERT_DATA_ORA = GETDATE(),
    UPDATE_DATA_ORA = GETDATE()

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
