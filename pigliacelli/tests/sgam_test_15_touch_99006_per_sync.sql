/*
    Sgam TEST — ritocca subvettore 99006 per un nuovo sync incrementale.
    Dopo sgam_test_13 (+ eventualmente 14).

    Cosa fa:
      - verifica che 99006 esista e sia attivo
      - cambia PEC (E_MAIL_CERTIFICATA)
      - UPDATE_DATA_ORA / INSERT_DATA_ORA = GETDATE()+2h (clock skew DEV)

    Poi su Pigliacelli: upsert_subvectors_basevettori
    Atteso: letti_sga>=1, aggiornati=1 e pec aggiornata su subvettori.

    Un solo batch: DBeaver "Esegui script".
*/

SET NOCOUNT ON
SET XACT_ABORT ON
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Societa smallint = 1
DECLARE @Codice int = 99006
DECLARE @PecNuova varchar(100) = 'vettore99006.sync@pec.it'
DECLARE @ErrMsg nvarchar(2048)

IF NOT EXISTS (
    SELECT 1
    FROM dbo.T2BaseVettori
    WHERE SOCIETA = @Societa
      AND CODICE = @Codice
      AND ATTIVO = 'S'
)
    BEGIN
        RAISERROR('Manca il subvettore 99006 attivo. Esegui prima sgam_test_13_nuovo_subvettore.sql.', 16, 1)
        RETURN
    END

BEGIN TRY
    BEGIN TRANSACTION

    UPDATE dbo.T2BaseVettori
    SET E_MAIL_CERTIFICATA = @PecNuova,
        /* +2h: Sgam DEV spesso in UTC rispetto a PHP */
        UPDATE_DATA_ORA = DATEADD(HOUR, 2, GETDATE()),
        INSERT_DATA_ORA = DATEADD(HOUR, 2, GETDATE())
    WHERE SOCIETA = @Societa
      AND CODICE = @Codice

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
    CODICE,
    RAGIONE_SOCIALE,
    E_MAIL,
    E_MAIL_CERTIFICATA,
    ATTIVO,
    INSERT_DATA_ORA,
    UPDATE_DATA_ORA
FROM dbo.T2BaseVettori
WHERE SOCIETA = @Societa
  AND CODICE = @Codice
