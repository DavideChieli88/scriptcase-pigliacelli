/*
    Sgam TEST — nuovo subvettore.
    Eseguire a mano su Sgam. Inserisce solo righe nuove.

    Cosa simula il job subvettori (insert_new_subvectors_basevettori
    e upsert_subvectors_basevettori):
      - anagrafica su T2BaseVettori, SOCIETA = 1
      - fiscalita su BaCliFor, stesso FORNITORE_CLIFOR / FORNITORE_CODICE
      - il job legge ragione sociale, indirizzo, localita, provincia,
        telefono, cellulare, email, PEC, partita IVA, codice fiscale
      - il codice entra in sincronizzazione solo se esiste un viaggio
        T2ViaggiVettori con ANNO >= 2024 (lo crea lo script 2),
        oppure se e' nella whitelist 4152 / 5911 / 5967
      - 99001 non e' nella lista codici esclusi

    Il job tratte, in piu', tiene solo i vettori con ATTIVO = 'S'.

    La riga nuova copia le colonne tecniche dall'ultimo vettore attivo
    gia presente (stessa forma del DB di DEV) e sostituisce i dati anagrafici.
    VIA e' un flag da 1 carattere: l'indirizzo che legge il job e' INDIRIZZO.

    Poi eseguire sgam_test_02_nuovo_viaggio.sql e solo dopo il job subvettori.
*/


-- Un solo batch, senza punto e virgola: DBeaver "Esegui script"
-- altrimenti manda ogni istruzione da sola e SQL Server non vede piu le variabili.
SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @NuovoCodice int = 99001
DECLARE @Ragione nvarchar(100) = N'TEST PIGLIACELLI VETTORE 99001'
DECLARE @Piva varchar(11) = '99001000001'
DECLARE @CodiceFiscale varchar(20) = 'TSTVTR9900100001'
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
        RAISERROR('T2BaseVettori ha gia il codice 99001. Cambia @NuovoCodice in cima ai due script.', 16, 1)
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
        RAISERROR('BaCliFor ha gia il fornitore 99001. Cambia @NuovoCodice.', 16, 1)
        RETURN
    END

IF EXISTS (
    SELECT 1
    FROM dbo.BaCliFor
    WHERE PARTITA_IVA = @Piva
)
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
        RAISERROR('Partita IVA 99001000001 gia presente. Cambia @Piva.', 16, 1)
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
    INDIRIZZO = N'VIA TEST 1',
    LOCALITA = N'BARI',
    PROVINCIA = 'BA',
    TELEFONO = '08000099001',
    CELLULARE = '33300099001',
    E_MAIL = 'vettore99001@example.com',
    E_MAIL_CERTIFICATA = 'vettore99001@pec.it'

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
