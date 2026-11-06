/*
    Sgam TEST — nuovo subvettore (terzo vettore di prova).
    Eseguire a mano su Sgam. Inserisce solo righe nuove.

    Differenza dallo script 01: codice 99003 (99001/99002 possono gia' esistere).

    INSERT_DATA_ORA / UPDATE_DATA_ORA = GETDATE() (obbligatori per upsert).
    Il job subvettori confronta con GETDATE() Sgam (sync_date_subvettori):
    niente +1h/+2h qui. Non usare le date del modello (vecchie → fuori finestra).

    Cosa simula il job subvettori (insert_new_subvectors_basevettori
    e upsert_subvectors_basevettori):
      - anagrafica su T2BaseVettori, SOCIETA = 1
      - fiscalita su BaCliFor, stesso FORNITORE_CLIFOR / FORNITORE_CODICE
      - il job legge ragione sociale, indirizzo, localita, provincia,
        telefono, cellulare, email, PEC, partita IVA, codice fiscale
      - upsert_subvectors_basevettori importa l'anagrafica SENZA richiedere
        viaggi (sync sganciata dalle tratte). Esclusi solo i codici in blacklist.
      - 99003 non e' nella lista codici esclusi

    Il job tratte resta separato: li' servono viaggi + ATTIVO = 'S'
    (sgam_test_06 / 07).

    Dopo questo script: lanciare upsert_subvectors_basevettori su Pigliacelli.
*/


-- Un solo batch, senza punto e virgola: DBeaver "Esegui script"
-- altrimenti manda ogni istruzione da sola e SQL Server non vede piu le variabili.
SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @NuovoCodice int = 99003
DECLARE @Ragione nvarchar(100) = N'TEST PIGLIACELLI VETTORE 99003'
DECLARE @Piva varchar(11) = '99003000001'
DECLARE @CodiceFiscale varchar(20) = 'TSTVTR9900300003'
DECLARE @TplCodice int
DECLARE @TplFornitore int
DECLARE @cols nvarchar(max)
DECLARE @sql nvarchar(max)
DECLARE @ErrMsg nvarchar(2048)

IF EXISTS (
    SELECT 1
    FROM dbo.T2BaseVettori
    WHERE SOCIETA = @Societa
      AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2BaseVettori ha gia il codice 99003. Cambia @NuovoCodice in cima allo script.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1
    FROM dbo.BaCliFor
    WHERE SOCIETA = @Societa
      AND CLIENTE_FORNITORE = 'F'
      AND CODICE = @NuovoCodice
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('BaCliFor ha gia il fornitore 99003. Cambia @NuovoCodice.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1
    FROM dbo.BaCliFor
    WHERE PARTITA_IVA = @Piva
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA 99003000001 gia presente. Cambia @Piva.', 16, 1)
        RETURN
    END

SELECT TOP (1)
    @TplCodice = v.CODICE,
    @TplFornitore = v.FORNITORE_CODICE
FROM dbo.T2BaseVettori v
INNER JOIN dbo.BaCliFor b
    ON b.SOCIETA = v.SOCIETA
   AND b.CLIENTE_FORNITORE = v.FORNITORE_CLIFOR
   AND b.CODICE = v.FORNITORE_CODICE
WHERE v.SOCIETA = @Societa
  AND v.ATTIVO = 'S'
  AND v.FORNITORE_CLIFOR = 'F'
  AND NULLIF(RTRIM(v.RAGIONE_SOCIALE), N'') IS NOT NULL
ORDER BY v.CODICE DESC

IF @TplCodice IS NULL
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Nessun T2BaseVettori attivo con fornitore BaCliFor da usare come modello.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

IF OBJECT_ID('tempdb..#tplFor') IS NOT NULL DROP TABLE #tplFor
SELECT *
INTO #tplFor
FROM dbo.BaCliFor
WHERE SOCIETA = @Societa
  AND CLIENTE_FORNITORE = 'F'
  AND CODICE = @TplFornitore

IF NOT EXISTS (SELECT 1 FROM #tplFor)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('BaCliFor modello del fornitore non trovato.', 16, 1)
        RETURN
    END

UPDATE #tplFor
SET CODICE = @NuovoCodice,
    CLIENTE_FORNITORE = 'F',
    RAGIONE_SOCIALE = @Ragione,
    PARTITA_IVA = @Piva,
    CODICE_FISCALE = @CodiceFiscale,
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

SET @sql = N'INSERT INTO dbo.BaCliFor (' + @cols + N') SELECT ' + @cols + N' FROM #tplFor'
EXEC sys.sp_executesql @sql

IF OBJECT_ID('tempdb..#tplVet') IS NOT NULL DROP TABLE #tplVet
SELECT *
INTO #tplVet
FROM dbo.T2BaseVettori
WHERE SOCIETA = @Societa
  AND CODICE = @TplCodice

IF NOT EXISTS (SELECT 1 FROM #tplVet)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('T2BaseVettori modello non trovato.', 16, 1)
        RETURN
    END

UPDATE #tplVet
SET CODICE = @NuovoCodice,
    FORNITORE_CLIFOR = 'F',
    FORNITORE_CODICE = @NuovoCodice,
    ATTIVO = 'S',
    RAGIONE_SOCIALE = @Ragione,
    INDIRIZZO = N'VIA TEST 3',
    LOCALITA = N'BARI',
    PROVINCIA = 'BA',
    TELEFONO = '08000099003',
    CELLULARE = '33300099003',
    E_MAIL = 'dantebalestra07@gmail.com',
    E_MAIL_CERTIFICATA = 'endlessnightmare@hotmail.it',
    /* Stessa scala di sync_date_subvettori (GETDATE Sgam). */
    INSERT_DATA_ORA = GETDATE(),
    UPDATE_DATA_ORA = GETDATE()

SELECT @cols = STUFF((
    SELECT ',' + QUOTENAME(c.name)
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.T2BaseVettori')
      AND c.is_identity = 0
      AND c.is_computed = 0
      AND c.system_type_id <> 189
    ORDER BY c.column_id
    FOR XML PATH(''), TYPE
).value('.', 'nvarchar(max)'), 1, 1, N'')

SET @sql = N'INSERT INTO dbo.T2BaseVettori (' + @cols + N') SELECT ' + @cols + N' FROM #tplVet'
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
    tbvt.CODICE,
    tbvt.RAGIONE_SOCIALE,
    tbvt.INDIRIZZO,
    tbvt.LOCALITA,
    tbvt.PROVINCIA,
    tbvt.TELEFONO,
    tbvt.CELLULARE,
    tbvt.E_MAIL,
    tbvt.E_MAIL_CERTIFICATA,
    tbvt.ATTIVO,
    tbvt.INSERT_DATA_ORA,
    tbvt.UPDATE_DATA_ORA,
    tbvt.FORNITORE_CLIFOR,
    tbvt.FORNITORE_CODICE,
    b.PARTITA_IVA,
    b.CODICE_FISCALE,
    @TplCodice AS modello_codice
FROM dbo.T2BaseVettori tbvt
LEFT JOIN dbo.BaCliFor b
    ON b.SOCIETA = tbvt.SOCIETA
   AND b.CLIENTE_FORNITORE = tbvt.FORNITORE_CLIFOR
   AND b.CODICE = tbvt.FORNITORE_CODICE
WHERE tbvt.SOCIETA = @Societa
  AND tbvt.CODICE = @NuovoCodice

