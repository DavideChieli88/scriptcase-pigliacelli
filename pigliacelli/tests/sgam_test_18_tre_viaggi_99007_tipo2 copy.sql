/*
    Sgam TEST — altri 3 viaggi per subvettore 99007 → contratto tipo 2
    (appendice nuove tratte).

    Prerequisiti:
      1. sgam_test_10 + sgam_test_11 gia eseguiti (almeno 990007 BARI→MILANO)
      2. su Pigliacelli: wizard_complete = 1 e tipo 1 gia presente
         (altrimenti il job apre tipo 1 invece di tipo 2)

    Chiavi (tutte nuove → 3 tratte nuove in un solo contratto tipo 2):
      VETTORE 99007
      990057 | FIRENZE → BOLOGNA | tariffa 175 | extra 15 | nolo 240
      990067 | PADOVA  → BRESCIA | tariffa 205 | extra 18 | nolo 270
      990077 | ANCONA  → PERUGIA | tariffa 165 | extra 12 | nolo 230

    Clona 990007 (cliente + C/S + merci + vettore + addebiti) e cambia
    numero, localita, importi e date. Non tocca i viaggi gia presenti.

    Date: DATEADD(HOUR, 1, GETDATE()) — allinea a PHP/Rome (sync_date UAT).

    Flusso su Pigliacelli:
      1. questo script su Sgam (DBeaver: Esegui script)
      2. check_new_trips_fast
         -> 3 tratte nuove + UN contratto tipo 2 con le 3 tratte

    Un solo batch, senza punto e virgola: DBeaver "Esegui script".
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @Codice int = 99007
DECLARE @NumeroOrigine int = 990007
DECLARE @SyncNow datetime = DATEADD(HOUR, 1, GETDATE())

DECLARE @Filiale varchar(2)
DECLARE @FilialeCliente varchar(2)
DECLARE @NumeroClienteOrigine int
DECLARE @NumeroCarico smallint
DECLARE @cols nvarchar(max)
DECLARE @sql nvarchar(max)
DECLARE @ErrMsg nvarchar(2048)

DECLARE @NumeroNuovo int
DECLARE @Tariffa money
DECLARE @Extra money
DECLARE @NoloCliente money
DECLARE @LocC varchar(50)
DECLARE @LocS varchar(50)
DECLARE @Label nvarchar(80)

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

SELECT
    @Filiale = FILIALE
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO = @NumeroOrigine
  AND VETTORE = @Codice
  AND TARIFFA = 'G'
  AND IMPORTO_UNITARIO > 0

IF @Filiale IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Manca il viaggio 2026 990007 del vettore 99007. Esegui prima sgam_test_11_viaggi_99007_tipo1.sql.', 16, 1)
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
  AND CLIENTE_NUMERO IS NOT NULL
  AND CLIENTE_NUMERO <> 0
ORDER BY PROGRESSIVO

IF @NumeroClienteOrigine IS NULL OR @NumeroCarico IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990007 non ha il carico collegato al viaggio cliente.', 16, 1)
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
      AND NULLIF(RTRIM(LOCALITA), '') IS NOT NULL
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990007 non ha lo scarico con localita.', 16, 1)
        RETURN
    END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiVettoriAddebiti
    WHERE SOCIETA = @Societa
      AND ANNO = @Anno
      AND FILIALE = @Filiale
      AND NUMERO = @NumeroOrigine
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Il viaggio 990007 non ha extra in T2ViaggiVettoriAddebiti.', 16, 1)
        RETURN
    END

IF OBJECT_ID('tempdb..#viaggi18') IS NOT NULL DROP TABLE #viaggi18
CREATE TABLE #viaggi18 (
    ordine int NOT NULL,
    numero int NOT NULL,
    tariffa money NOT NULL,
    extra money NOT NULL,
    nolo money NOT NULL,
    loc_c varchar(50) NOT NULL,
    loc_s varchar(50) NOT NULL,
    label nvarchar(80) NOT NULL
)

INSERT INTO #viaggi18 (ordine, numero, tariffa, extra, nolo, loc_c, loc_s, label) VALUES
(1, 990057, 175, 15, 240, 'FIRENZE', 'BOLOGNA', N'FIRENZE-BOLOGNA'),
(2, 990067, 205, 18, 270, 'PADOVA',  'BRESCIA', N'PADOVA-BRESCIA'),
(3, 990077, 165, 12, 230, 'ANCONA',  'PERUGIA', N'ANCONA-PERUGIA')

IF EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiVettori v
    INNER JOIN #viaggi18 t ON t.numero = v.NUMERO
    WHERE v.SOCIETA = @Societa
      AND v.ANNO = @Anno
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Uno dei numeri 990057/990067/990077 esiste gia in T2ViaggiVettori 2026.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1
    FROM dbo.T2ViaggiClienti c
    INNER JOIN #viaggi18 t ON t.numero = c.NUMERO
    WHERE c.SOCIETA = @Societa
      AND c.ANNO = @Anno
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Uno dei numeri 990057/990067/990077 esiste gia in T2ViaggiClienti 2026.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

    DECLARE cur18 CURSOR LOCAL FAST_FORWARD FOR
        SELECT numero, tariffa, extra, nolo, loc_c, loc_s, label
        FROM #viaggi18
        ORDER BY ordine

    OPEN cur18
    FETCH NEXT FROM cur18 INTO @NumeroNuovo, @Tariffa, @Extra, @NoloCliente, @LocC, @LocS, @Label

    WHILE @@FETCH_STATUS = 0
    BEGIN
        /* Viaggio cliente */
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
            DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI 99007 ' + @Label,
            ORDINE_RIFERIMENTO = N'TEST-' + CAST(@NumeroNuovo AS varchar(12)),
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

        /* Carichi/scarichi cliente */
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
        SET CARICO_RAGIONE_SOCIALE = N'TEST CARICATORE PIGLIACELLI 99007',
            CARICO_LOCALITA = @LocC,
            SCARICO_RAGIONE_SOCIALE = N'TEST DESTINATARIO PIGLIACELLI 99007',
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

        /* Merci */
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

        UPDATE #srcMerci
        SET MERCE_CODICE = 'TEST',
            MERCE_DESCRIZIONE = N'MERCE TEST PIGLIACELLI 99007 ' + @Label
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

        SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #srcMerci'
        EXEC sys.sp_executesql @sql

        /* Viaggio vettore */
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
            DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI 99007 ' + CAST(@Label AS varchar(80)),
            IMPORTO_UNITARIO = @Tariffa,
            IMPORTO_TOTALE = @Tariffa,
            CONTROVALORE_IMPORTO_TOTALE = @Tariffa,
            PARTENZA_DATA_ORA = '20261116 10:00:00',
            DATA = '20261116',
            DATA_COMPETENZA = '20261116',
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

        /* Ponte C/S */
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
        SET LOCALITA = @LocC,
            CLIENTE_ANNO = @Anno,
            CLIENTE_FILIALE = @FilialeCliente,
            CLIENTE_NUMERO = @NumeroNuovo,
            CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
        WHERE OPERAZIONE = 'C'

        UPDATE #srcOp
        SET LOCALITA = @LocS,
            CLIENTE_ANNO = @Anno,
            CLIENTE_FILIALE = @FilialeCliente,
            CLIENTE_NUMERO = @NumeroNuovo,
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

        SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #srcOp'
        EXEC sys.sp_executesql @sql

        /* Extra */
        IF OBJECT_ID('tempdb..#srcAddebiti') IS NOT NULL DROP TABLE #srcAddebiti
        SELECT *
        INTO #srcAddebiti
        FROM dbo.T2ViaggiVettoriAddebiti
        WHERE SOCIETA = @Societa
          AND ANNO = @Anno
          AND FILIALE = @Filiale
          AND NUMERO = @NumeroOrigine

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

        FETCH NEXT FROM cur18 INTO @NumeroNuovo, @Tariffa, @Extra, @NoloCliente, @LocC, @LocS, @Label
    END

    CLOSE cur18
    DEALLOCATE cur18

    COMMIT TRANSACTION
END TRY
BEGIN CATCH
    IF CURSOR_STATUS('local', 'cur18') >= -1
    BEGIN
        CLOSE cur18
        DEALLOCATE cur18
    END
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
    (
        SELECT COALESCE(SUM(a.IMPORTO_TOTALE), 0)
        FROM dbo.T2ViaggiVettoriAddebiti a
        WHERE a.SOCIETA = v.SOCIETA AND a.ANNO = v.ANNO AND a.NUMERO = v.NUMERO
    ) AS extra,
    (
        SELECT TOP 1 RTRIM(c.LOCALITA)
        FROM dbo.T2ViaggiVettoriClienti c
        WHERE c.SOCIETA = v.SOCIETA AND c.ANNO = v.ANNO AND c.NUMERO = v.NUMERO AND c.OPERAZIONE = 'C'
        ORDER BY c.PROGRESSIVO
    ) AS carico,
    (
        SELECT TOP 1 RTRIM(c.LOCALITA)
        FROM dbo.T2ViaggiVettoriClienti c
        WHERE c.SOCIETA = v.SOCIETA AND c.ANNO = v.ANNO AND c.NUMERO = v.NUMERO AND c.OPERAZIONE = 'S'
        ORDER BY c.PROGRESSIVO
    ) AS scarico,
    v.UPDATE_DATA_ORA
FROM dbo.T2ViaggiVettori v
WHERE v.SOCIETA = @Societa
  AND v.ANNO = @Anno
  AND v.VETTORE = @Codice
  AND v.NUMERO IN (990057, 990067, 990077)
ORDER BY v.NUMERO

SELECT c.NUMERO, c.OPERAZIONE, RTRIM(c.LOCALITA) AS LOCALITA, c.CLIENTE_NUMERO
FROM dbo.T2ViaggiVettoriClienti c
WHERE c.SOCIETA = @Societa
  AND c.ANNO = @Anno
  AND c.FILIALE = @Filiale
  AND c.NUMERO IN (990057, 990067, 990077)
  AND c.OPERAZIONE IN ('C', 'S')
ORDER BY c.NUMERO, c.OPERAZIONE, c.PROGRESSIVO

SELECT vcl.NUMERO, vcl.IMPORTO_TOTALE AS tariffa_cliente
FROM dbo.T2ViaggiClienti vcl
WHERE vcl.SOCIETA = @Societa
  AND vcl.ANNO = @Anno
  AND vcl.FILIALE = @FilialeCliente
  AND vcl.NUMERO IN (990057, 990067, 990077)
ORDER BY vcl.NUMERO
