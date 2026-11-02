/*
    Sgam TEST — tre viaggi per subvettore 99006 (base contratto tipo 1).
    Dopo sgam_test_13 + upsert anagrafica.

    Chiavi:
      VETTORE 99006
      viaggio/cliente 990006  | BARI → MILANO   | tariffa 180 | extra 25 | nolo 250
      viaggio/cliente 990016  | NAPOLI → TORINO | tariffa 220 | extra 30 | nolo 300
      viaggio/cliente 990026  | GENOVA → VERONA | tariffa 195 | extra 20 | nolo 280

    Flusso tipo 1 su Pigliacelli:
      1. anagrafica 99006 gia presente
      2. questo script crea i 3 viaggi SGA
      3. UPDATE subvettori SET wizard_complete = 1 WHERE codice_sga = '99006'
         (deve avere ZERO tratte)
      4. check_new_trips_nuovo_contratto_basevettori_v2
         -> backfill -> 3 tratte + UN contratto tipo 1

    Un solo batch, senza punto e virgola: DBeaver "Esegui script".
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @NuovoCodice int = 99006
DECLARE @PivaCliente varchar(11) = '99006000002'
DECLARE @CfCliente varchar(20) = 'TSTCLI9900600002'
DECLARE @RagioneCliente nvarchar(100) = N'TEST PIGLIACELLI CLIENTE 99006'

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
        RAISERROR('Manca il subvettore 99006 attivo. Esegui prima sgam_test_13_nuovo_subvettore.sql.', 16, 1)
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
        RAISERROR('Manca il fornitore BaCliFor 99006. Esegui prima lo script 13.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO IN (990006, 990016, 990026)
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia 990006/990016/990026 nel 2026. Cambia i numeri o pulisci.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO IN (990006, 990016, 990026)
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia 990006/990016/990026 nel 2026. Cambia i numeri o pulisci.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa AND CLIENTE_FORNITORE = 'C' AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('BaCliFor ha gia il cliente 99006. Se e'' di un test precedente, riusalo o cambia codice.', 16, 1)
        RETURN
    END

IF EXISTS (SELECT 1 FROM dbo.BaCliFor WHERE PARTITA_IVA = @PivaCliente)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA cliente 99006000002 gia presente. Cambia @PivaCliente.', 16, 1)
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

IF OBJECT_ID('tempdb..#t14Trips') IS NOT NULL DROP TABLE #t14Trips
CREATE TABLE #t14Trips (
    NumeroViaggio int NOT NULL,
    NumeroCliente int NOT NULL,
    TariffaSubvettore money NOT NULL,
    NoloCliente money NOT NULL,
    ExtraSubvettore money NOT NULL,
    LocC varchar(50) NOT NULL,
    LocS varchar(50) NOT NULL,
    OrdineRif nvarchar(40) NOT NULL
)

INSERT INTO #t14Trips (NumeroViaggio, NumeroCliente, TariffaSubvettore, NoloCliente, ExtraSubvettore, LocC, LocS, OrdineRif)
VALUES
    (990006, 990006, 180, 250, 25, 'BARI', 'MILANO', N'TEST-990006'),
    (990016, 990016, 220, 300, 30, 'NAPOLI', 'TORINO', N'TEST-990016'),
    (990026, 990026, 195, 280, 20, 'GENOVA', 'VERONA', N'TEST-990026')

BEGIN TRY
    BEGIN TRANSACTION

DECLARE trip_cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT NumeroViaggio, NumeroCliente, TariffaSubvettore, NoloCliente, ExtraSubvettore, LocC, LocS, OrdineRif
    FROM #t14Trips
    ORDER BY NumeroViaggio

OPEN trip_cur
FETCH NEXT FROM trip_cur INTO
    @NumeroViaggio, @NumeroCliente, @TariffaSubvettore, @NoloCliente, @ExtraSubvettore, @LocC, @LocS, @OrdineRif

WHILE @@FETCH_STATUS = 0
BEGIN

/* Cliente BaCliFor una sola volta (proprietario merce). */
IF @ClienteCreato = 0
BEGIN
    IF OBJECT_ID('tempdb..#t14CliFor') IS NOT NULL DROP TABLE #t14CliFor
    SELECT *
    INTO #t14CliFor
    FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa
      AND CLIENTE_FORNITORE = 'C'
      AND CODICE = @TplClienteCodice

    UPDATE #t14CliFor
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

    SET @sql = N'INSERT INTO dbo.BaCliFor (' + @cols + N') SELECT ' + @cols + N' FROM #t14CliFor'
    EXEC sys.sp_executesql @sql
    SET @ClienteCreato = 1
END

/* Viaggio cliente: IMPORTO_TOTALE = tariffa_cliente. */
IF OBJECT_ID('tempdb..#t14Cli') IS NOT NULL DROP TABLE #t14Cli
SELECT *
INTO #t14Cli
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t14Cli
SET NUMERO = @NumeroCliente,
    CLIENTE = @NuovoCodice,
    CLIENTE_CLIFOR = 'C',
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI 99006',
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t14Cli'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t14Cs') IS NOT NULL DROP TABLE #t14Cs
SELECT *
INTO #t14Cs
FROM dbo.T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t14Cs
SET NUMERO = @NumeroCliente

UPDATE #t14Cs
SET CARICO_RAGIONE_SOCIALE = N'TEST CARICATORE PIGLIACELLI 99006',
    CARICO_LOCALITA = @LocC,
    SCARICO_RAGIONE_SOCIALE = N'TEST DESTINATARIO PIGLIACELLI 99006',
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichi (' + @cols + N') SELECT ' + @cols + N' FROM #t14Cs'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t14Merci') IS NOT NULL DROP TABLE #t14Merci
SELECT *
INTO #t14Merci
FROM dbo.T2ViaggiClientiCarichiScarichiMerci
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #t14Merci
SET NUMERO = @NumeroCliente

UPDATE #t14Merci
SET MERCE_CODICE = 'TEST',
    MERCE_DESCRIZIONE = N'MERCE TEST PIGLIACELLI 99006'
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #t14Merci'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t14Vet') IS NOT NULL DROP TABLE #t14Vet
SELECT *
INTO #t14Vet
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t14Vet
SET NUMERO = @NumeroViaggio,
    VETTORE = @NuovoCodice,
    FORNITORE = @NuovoCodice,
    FORNITORE_CLIFOR = 'F',
    TARIFFA = 'G',
    DESCRIZIONE_TARIFFA = 'TEST PIGLIACELLI 99006',
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettori (' + @cols + N') SELECT ' + @cols + N' FROM #t14Vet'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#t14Op') IS NOT NULL DROP TABLE #t14Op
SELECT *
INTO #t14Op
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #t14Op
SET NUMERO = @NumeroViaggio,
    CLIENTE_ANNO = NULL,
    CLIENTE_FILIALE = NULL,
    CLIENTE_NUMERO = NULL,
    CLIENTE_NUMERO_CARICO_SCARICO = NULL

UPDATE #t14Op
SET LOCALITA = @LocC,
    CLIENTE_ANNO = @Anno,
    CLIENTE_FILIALE = @FilialeCliente,
    CLIENTE_NUMERO = @NumeroCliente,
    CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
WHERE OPERAZIONE = 'C'

UPDATE #t14Op
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #t14Op'
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
  AND v.NUMERO IN (990006, 990016, 990026)
ORDER BY v.NUMERO

SELECT NUMERO, OPERAZIONE, LOCALITA, CLIENTE_NUMERO
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND NUMERO IN (990006, 990016, 990026)
  AND OPERAZIONE IN ('C', 'S')
ORDER BY NUMERO, OPERAZIONE, PROGRESSIVO
