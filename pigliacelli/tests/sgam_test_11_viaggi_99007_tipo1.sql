/*
    Sgam TEST — due viaggi per subvettore 99007 (base contratto tipo 1).
    Dopo sgam_test_10 + upsert anagrafica.

    Chiavi:
      VETTORE 99007
      viaggio/cliente 990007  | BARI → MILANO  | tariffa 180 | extra 25 | nolo 250
      viaggio/cliente 990017  | NAPOLI → TORINO | tariffa 220 | extra 30 | nolo 300

    Flusso tipo 1 su Pigliacelli:
      1. anagrafica 99007 gia presente
      2. questo script crea i 2 viaggi SGA
      3. UPDATE subvettori SET wizard_complete = 1 WHERE codice_sga = '99007'
         (deve avere ZERO tratte)
      4. check_new_trips_nuovo_contratto_basevettori_v2
         -> backfill -> 2 tratte + UN contratto tipo 1

    Un solo batch, senza punto e virgola: DBeaver "Esegui script".
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @NuovoCodice int = 99007
DECLARE @PivaCliente varchar(11) = '99007000002'
DECLARE @CfCliente varchar(20) = 'TSTCLI9900700003'
DECLARE @RagioneCliente nvarchar(100) = N'TEST PIGLIACELLI CLIENTE 99007'

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

DECLARE @NumeroViaggio int
DECLARE @NumeroCliente int
DECLARE @TariffaSubvettore money
DECLARE @NoloCliente money
DECLARE @ExtraSubvettore money
DECLARE @LocC varchar(50)
DECLARE @LocS varchar(50)
DECLARE @OrdineRif nvarchar(40)
DECLARE @ClienteCreato bit = 0

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
        RAISERROR('Manca il subvettore 99007 attivo. Esegui prima sgam_test_10_nuovo_subvettore.sql.', 16, 1)
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
        RAISERROR('Manca il fornitore BaCliFor 99007. Esegui prima lo script 10.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO IN (990007, 990017)
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia 990007 e/o 990017 nel 2026. Cambia i numeri o pulisci.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO IN (990007, 990017)
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia 990007 e/o 990017 nel 2026. Cambia i numeri o pulisci.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa AND CLIENTE_FORNITORE = 'C' AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('BaCliFor ha gia il cliente 99007. Se e'' di un test precedente, riusalo o cambia codice.', 16, 1)
        RETURN
    END

IF EXISTS (SELECT 1 FROM dbo.BaCliFor WHERE PARTITA_IVA = @PivaCliente)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA cliente 99007000002 gia presente. Cambia @PivaCliente.', 16, 1)
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

IF OBJECT_ID('tempdb..#t11Trips') IS NOT NULL DROP TABLE #t11Trips
CREATE TABLE #t11Trips (
    NumeroViaggio int NOT NULL,
    NumeroCliente int NOT NULL,
    TariffaSubvettore money NOT NULL,
    NoloCliente money NOT NULL,
    ExtraSubvettore money NOT NULL,
    LocC varchar(50) NOT NULL,
    LocS varchar(50) NOT NULL,
    OrdineRif nvarchar(40) NOT NULL
)

INSERT INTO #t11Trips (NumeroViaggio, NumeroCliente, TariffaSubvettore, NoloCliente, ExtraSubvettore, LocC, LocS, OrdineRif)
VALUES
    (990007, 990007, 180, 250, 25, 'BARI', 'MILANO', N'TEST-990007'),
    (990017, 990017, 220, 300, 30, 'NAPOLI', 'TORINO', N'TEST-990017')

BEGIN TRY
    BEGIN TRANSACTION

DECLARE trip_cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT NumeroViaggio, NumeroCliente, TariffaSubvettore, NoloCliente, ExtraSubvettore, LocC, LocS, OrdineRif
    FROM #t11Trips
    ORDER BY NumeroViaggio

OPEN trip_cur
FETCH NEXT FROM trip_cur INTO
    @NumeroViaggio, @NumeroCliente, @TariffaSubvettore, @NoloCliente, @ExtraSubvettore, @LocC, @LocS, @OrdineRif

WHILE @@FETCH_STATUS = 0
BEGIN

/* Cliente BaCliFor una sola volta (proprietario merce). */
IF @ClienteCreato = 0
BEGIN
    IF OBJECT_ID('tempdb..#t11CliFor') IS NOT NULL DROP TABLE #t11CliFor
    SELECT *
    INTO #t11CliFor
    FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa
      AND CLIENTE_FORNITORE = 'C'
      AND CODICE = @TplClienteCodice

    UPDATE #t11CliFor
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

    SET @sql = N'INSERT INTO dbo.BaCliFor (' + @cols + N') SELECT ' + @cols + N' FROM #t11CliFor'
    EXEC sys.sp_executesql @sql
    SET @ClienteCreato = 1
END

/* Viaggio cliente: IMPORTO_TOTALE = tariffa_cliente. */
IF OBJECT_ID('tempdb..#t11Cli') IS NOT NULL DROP TABLE #t11Cli
SELECT *
INTO #t11Cli
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t11Cli
SET NUMERO = @NumeroCliente,
    CLIENTE = @NuovoCodice,
    CLIENTE_CLIFOR = 'C',
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI 99007',
    ORDINE_RIFERIMENTO = @OrdineRif,
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t11Cli'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t11Cs') IS NOT NULL DROP TABLE #t11Cs
SELECT *
INTO #t11Cs
FROM dbo.T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t11Cs
SET NUMERO = @NumeroCliente

UPDATE #t11Cs
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichi (' + @cols + N') SELECT ' + @cols + N' FROM #t11Cs'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t11Merci') IS NOT NULL DROP TABLE #t11Merci
SELECT *
INTO #t11Merci
FROM dbo.T2ViaggiClientiCarichiScarichiMerci
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t11Merci
SET NUMERO = @NumeroCliente

UPDATE #t11Merci
SET MERCE_CODICE = 'TEST',
    MERCE_DESCRIZIONE = N'MERCE TEST PIGLIACELLI 99007'
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #t11Merci'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t11Vet') IS NOT NULL DROP TABLE #t11Vet
SELECT *
INTO #t11Vet
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t11Vet
SET NUMERO = @NumeroViaggio,
    VETTORE = @NuovoCodice,
    FORNITORE = @NuovoCodice,
    FORNITORE_CLIFOR = 'F',
    TARIFFA = 'G',
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI 99007',
    IMPORTO_UNITARIO = @TariffaSubvettore,
    IMPORTO_TOTALE = @TariffaSubvettore,
    CONTROVALORE_IMPORTO_TOTALE = @TariffaSubvettore,
    PARTENZA_DATA_ORA = '20261030 08:00:00',
    DATA = '20261030',
    DATA_COMPETENZA = '20261030',
    INSERT_DATA_ORA = GETDATE(),
    UPDATE_DATA_ORA = GETDATE(),
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettori (' + @cols + N') SELECT ' + @cols + N' FROM #t11Vet'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t11Op') IS NOT NULL DROP TABLE #t11Op
SELECT *
INTO #t11Op
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t11Op
SET NUMERO = @NumeroViaggio,
    CLIENTE_ANNO = NULL,
    CLIENTE_FILIALE = NULL,
    CLIENTE_NUMERO = NULL,
    CLIENTE_NUMERO_CARICO_SCARICO = NULL

UPDATE #t11Op
SET LOCALITA = @LocC,
    CLIENTE_ANNO = @Anno,
    CLIENTE_FILIALE = @FilialeCliente,
    CLIENTE_NUMERO = @NumeroCliente,
    CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
WHERE OPERAZIONE = 'C'

UPDATE #t11Op
SET LOCALITA = @LocS,
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t11Op'
EXEC sys.sp_executesql @sql

INSERT INTO dbo.T2ViaggiVettoriAddebiti
    (SOCIETA, ANNO, FILIALE, NUMERO, PROGRESSIVO, AUTOMATICA, IMPORTO_TOTALE)
VALUES
    (@Societa, @Anno, @FilialeVettore, @NumeroViaggio, 1, 'N', @ExtraSubvettore)

FETCH NEXT FROM trip_cur INTO
    @NumeroViaggio, @NumeroCliente, @TariffaSubvettore, @NoloCliente, @ExtraSubvettore, @LocC, @LocS, @OrdineRif
END

CLOSE trip_cur
DEALLOCATE trip_cur

    COMMIT TRANSACTION
END TRY
BEGIN CATCH
    IF CURSOR_STATUS('local', 'trip_cur') >= -1
    BEGIN
        CLOSE trip_cur
        DEALLOCATE trip_cur
    END
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION
    SET @ErrMsg = LEFT(ERROR_MESSAGE(), 2048)
    RAISERROR(@ErrMsg, 16, 1)
    RETURN
END CATCH

/* Controllo: stessi filtri del job tratte. */
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
    ) AS extra_subvettore,
    v.UPDATE_DATA_ORA
FROM dbo.T2ViaggiVettori v
INNER JOIN dbo.T2BaseVettori t
    ON t.CODICE = v.VETTORE
   AND t.SOCIETA = v.SOCIETA
   AND t.ATTIVO = 'S'
WHERE v.SOCIETA = @Societa
  AND v.ANNO = @Anno
  AND v.NUMERO IN (990007, 990017)
ORDER BY v.NUMERO

SELECT NUMERO, OPERAZIONE, LOCALITA, CLIENTE_NUMERO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO IN (990007, 990017)
  AND OPERAZIONE IN ('C', 'S')
ORDER BY NUMERO, OPERAZIONE, PROGRESSIVO
