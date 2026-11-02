/*
    Sgam TEST — un viaggio per il subvettore 99001.
    Eseguire a mano su Sgam, dopo sgam_test_01_nuovo_subvettore.sql.
    Inserisce solo righe nuove. Le chiavi 99001 e 990001 vanno tenute
    allineate allo script 1.

    Modello di colonne: viaggio vettore 2026/SE/39567, gia presente su
    questo Sgam, con cliente 2026/SE/40388, carico/scarico e merce.
    I testi e gli importi sotto sono quelli del test.

    Cosa legge il job tratte (check_new_trips e insert_new_trips T0):
      T2ViaggiVettori
        VETTORE = codice subvettore, T2BaseVettori.ATTIVO = 'S'
        TARIFFA = sigla (qui G) -> tipo_tariffe.descrizione
        IMPORTO_UNITARIO = tariffa subvettore (deve essere > 0)
        UPDATE_DATA_ORA / INSERT_DATA_ORA = finestra dello sync incrementale
        ANNO >= export_viaggi_anno per il T0, qui 2026
      T2ViaggiVettoriClienti operazione C e S
        LOCALITA = carico e scarico della tratta
        CLIENTE_ANNO / FILIALE / NUMERO = ponte verso il viaggio cliente
        CLIENTE_NUMERO_CARICO_SCARICO = ponte verso carico, merce, caricatore
      T2ViaggiClienti.IMPORTO_TOTALE = nolo cliente (tariffa_cliente)
        C e S puntano allo stesso viaggio cliente: il job somma una volta sola
      T2ViaggiClientiCarichiScarichi.CARICO_RAGIONE_SOCIALE = caricatore
      BaCliFor cliente C, codice = T2ViaggiClienti.CLIENTE = proprietario merce
      T2ViaggiClientiCarichiScarichiMerci = codice + descrizione merce
      T2ViaggiVettoriAddebiti.IMPORTO_TOTALE = extra subvettore

    Sul Pigliacelli, dopo questi due script:
      1. job subvettori (il codice entra perche ora ha un viaggio >= 2024)
      2. job tratte, con la colonna tratte.tariffa_cliente gia creata
    Il T0 importa il viaggio se il codice e' gia in subvettori e lo marca legacy.
    Il job incrementale lo importa se il subvettore ha il wizard completo.
    Se non ha ancora tratte, il backfill di fine giro lo prende comunque
    (legge tutti i viaggi del codice con ANNO >= 2024, qui solo questo).
    La tariffa cliente non entra nell'hash e non apre una variazione di contratto.

    Importi attesi in Pigliacelli:
      tariffa 180,00 | extra 25,00 | totale 205,00 | tariffa_cliente 250,00
      carico BARI | scarico MILANO
      caricatore TEST CARICATORE PIGLIACELLI
      proprietario TEST PIGLIACELLI CLIENTE 99001
      merce TEST - MERCE TEST PIGLIACELLI
*/


-- Un solo batch, senza punto e virgola: DBeaver "Esegui script"
-- altrimenti manda ogni istruzione da sola e SQL Server non vede piu le variabili.
SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Anno smallint = 2026
DECLARE @NuovoCodice int = 99001
DECLARE @NumeroViaggio int = 990001
DECLARE @NumeroCliente int = 990001
DECLARE @PivaCliente varchar(11) = '99001000002'
DECLARE @CfCliente varchar(20) = 'TSTCLI9900100002'
DECLARE @RagioneCliente nvarchar(100) = N'TEST PIGLIACELLI CLIENTE 99001'
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
        RAISERROR('Manca il subvettore 99001 attivo. Esegui prima sgam_test_01_nuovo_subvettore.sql.', 16, 1)
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
        RAISERROR('Manca il fornitore BaCliFor 99001. Esegui prima lo script 1.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiVettori
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroViaggio
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiVettori ha gia il numero 990001 nel 2026. Cambia @NumeroViaggio.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.T2ViaggiClienti
    WHERE SOCIETA = @Societa AND ANNO = @Anno AND NUMERO = @NumeroCliente
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2ViaggiClienti ha gia il numero 990001 nel 2026. Cambia @NumeroCliente.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1 FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa AND CLIENTE_FORNITORE = 'C' AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('BaCliFor ha gia il cliente 99001. Cambia @NuovoCodice nei due script.', 16, 1)
        RETURN
    END

IF EXISTS (SELECT 1 FROM dbo.BaCliFor WHERE PARTITA_IVA = @PivaCliente)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA cliente 99001000002 gia presente. Cambia @PivaCliente.', 16, 1)
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

/* Cliente committente: il job lo legge come proprietario merce. */
IF OBJECT_ID('tempdb..#tplCliFor') IS NOT NULL DROP TABLE #tplCliFor
SELECT *
INTO #tplCliFor
FROM dbo.BaCliFor
WHERE SOCIETA = @Societa
  AND CLIENTE_FORNITORE = 'C'
  AND CODICE = @TplClienteCodice

UPDATE #tplCliFor
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

SET @sql = N'INSERT INTO dbo.BaCliFor (' + @cols + N') SELECT ' + @cols + N' FROM #tplCliFor'
EXEC sys.sp_executesql @sql

/* Viaggio cliente: IMPORTO_TOTALE e' il nolo che finisce in tariffa_cliente. */
IF OBJECT_ID('tempdb..#tplCli') IS NOT NULL DROP TABLE #tplCli
SELECT *
INTO #tplCli
FROM dbo.T2ViaggiClienti
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #tplCli
SET NUMERO = @NumeroCliente,
    CLIENTE = @NuovoCodice,
    CLIENTE_CLIFOR = 'C',
    DESCRIZIONE = N'VIAGGIO TEST PIGLIACELLI',
    ORDINE_RIFERIMENTO = N'TEST-990001',
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClienti (' + @cols + N') SELECT ' + @cols + N' FROM #tplCli'
EXEC sys.sp_executesql @sql

/* Carico/scarico del viaggio cliente: da qui esce il caricatore. */
IF OBJECT_ID('tempdb..#tplCs') IS NOT NULL DROP TABLE #tplCs
SELECT *
INTO #tplCs
FROM dbo.T2ViaggiClientiCarichiScarichi
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #tplCs
SET NUMERO = @NumeroCliente

UPDATE #tplCs
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichi (' + @cols + N') SELECT ' + @cols + N' FROM #tplCs'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#tplMerci') IS NOT NULL DROP TABLE #tplMerci
SELECT *
INTO #tplMerci
FROM dbo.T2ViaggiClientiCarichiScarichiMerci
WHERE SOCIETA = @Societa
  AND ANNO = @Anno
  AND FILIALE = @FilialeCliente
  AND NUMERO = @TplNumeroCliente

UPDATE #tplMerci
SET NUMERO = @NumeroCliente

UPDATE #tplMerci
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

SET @sql = N'INSERT INTO dbo.T2ViaggiClientiCarichiScarichiMerci (' + @cols + N') SELECT ' + @cols + N' FROM #tplMerci'
EXEC sys.sp_executesql @sql

/* Viaggio subvettore. UPDATE_DATA_ORA = adesso, cosi entra nella finestra incrementale. */
IF OBJECT_ID('tempdb..#tplVet') IS NOT NULL DROP TABLE #tplVet
SELECT *
INTO #tplVet
FROM dbo.T2ViaggiVettori
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #tplVet
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettori (' + @cols + N') SELECT ' + @cols + N' FROM #tplVet'
EXEC sys.sp_executesql @sql

/*
    Operazioni del viaggio.
    Il job costruisce la tratta solo con C e S.
    Gli altri progressivi (P, L, ...) restano, con il riferimento cliente svuotato,
    cosi il nolo non viene sommato due volte.
*/
IF OBJECT_ID('tempdb..#tplOp') IS NOT NULL DROP TABLE #tplOp
SELECT *
INTO #tplOp
FROM dbo.T2ViaggiVettoriClienti
WHERE SOCIETA = @Societa
  AND ANNO = @TplAnno
  AND FILIALE = @FilialeVettore
  AND NUMERO = @TplNumero

UPDATE #tplOp
SET NUMERO = @NumeroViaggio,
    CLIENTE_ANNO = NULL,
    CLIENTE_FILIALE = NULL,
    CLIENTE_NUMERO = NULL,
    CLIENTE_NUMERO_CARICO_SCARICO = NULL

UPDATE #tplOp
SET LOCALITA = 'BARI',
    CLIENTE_ANNO = @Anno,
    CLIENTE_FILIALE = @FilialeCliente,
    CLIENTE_NUMERO = @NumeroCliente,
    CLIENTE_NUMERO_CARICO_SCARICO = @NumeroCarico
WHERE OPERAZIONE = 'C'

UPDATE #tplOp
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

SET @sql = N'INSERT INTO dbo.T2ViaggiVettoriClienti (' + @cols + N') SELECT ' + @cols + N' FROM #tplOp'
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
