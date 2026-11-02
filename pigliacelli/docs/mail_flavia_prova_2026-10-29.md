# Mail Flavia — nuova prova portale (29/10/2026)

Mail a Erik dopo un’ulteriore prova. Oggi di riferimento: 29/10/2026.

---

## Testo

Buonasera Erik,

alla luce di una nuova prova ti evidenzio che:

La sincronizzazione con SGA del nuovo vettore di prova è legata all’attribuzione di una tratta. Come già detto in precedenza, la sincronizzazione deve essere sganciata dall’attribuzione allo stesso della tratta. Infatti, per poterla attribuire dobbiamo prima verificare i documenti che caricherà sul portale. Non possiamo procedere con le nostre verifiche preliminari se continuiamo a legare la sincronizzazione con SGA all’attribuzione della tratta.

Lato Vettore:

- Nella compilazione dei vari flussi documentali avevamo chiesto di spostare, se possibile, i pulsanti “Salva, Indietro e Prossimo” in basso per facilitare l’utilizzo.
- Abbiamo visto che, nella sezione FLUSSO DOCUMENTALE, la scadenza relativa alla ricevuta pagamento ANGA è stata inserita in automatico al 30 aprile (anno successivo alla registrazione). È possibile renderla non modificabile? In aggiunta, è possibile applicare lo stesso discorso anche a Ricevuta Pagamento Rentri (30 aprile) e Ricevuta Pagamento Albo Conto Terzi (sempre il 31 gennaio).
- Al momento della firma digitale, sempre lato vettore, non visualizziamo il Manuale del Vettore.
- Completata la procedura di registrazione del vettore riceviamo l’email “ha completato il wizard di onboarding”. Per utilità possiamo ricevere una notifica anche sul portale? (ad oggi non riceviamo alcuna comunicazione).
- Completata la registrazione del vettore, lato PGL non troviamo riferimenti allo stesso nella sezione DOCUMENTAZIONE e TRATTE (che gli sono state assegnate).

La criticità maggiore riguarda il contratto:

- Prima di inviarlo l’operatore Pigliacelli ha necessità di vedere il documento (oggi possiamo solo inviarlo senza visionarlo)
- Testando l’invio del contratto abbiamo riscontrato che non viene ricevuto dal vettore.

Ti ricordo anche di anticipare, non appena possibile, il video tutorial che hai proposto di realizzare per facilitare l’utilizzo della piattaforma al vettore.

Ho provato a contattarti telefonicamente per richiedervi un incontro in presenza per palesarvi alcune difficoltà che riscontriamo nell’utilizzo del portale e che, non sempre, è facile sintetizzare per email.

Restiamo in attesa di un tuo riscontro

Grazie e a presto

Un saluto

Flavia

---

## Cosa non torna / note tecniche (29/10/2026)

Elenco punti mail vs codice / comportamento noto. Da usare per risposta a Erik/Flavia e per priorità fix.

### 1. Sync SGA legata all’attribuzione tratta — **requisito già aperto, non “nuovo”**

Già in `pigliacelli_briefing_sal_2026-09-30.md` (D9): due sync separate — **anagrafica vettori** (onboarding) vs **tratte**. Oggi il job tratte (`check_new_trips_*` / upsert) crea/aggiorna il subvettore quando la tratta arriva da SGA (`skip_sub_assente` se manca). Flavia chiede di poter verificare i documenti **prima** di attribuire tratte: coerente col disegno a due sync, non ancora separato in produzione come loro intendono.

**Attenzione al fraintendimento:** “attribuzione della tratta” lato PGL ≠ sync SGA. Se il vettore di prova compare solo quando in SGA ha una tratta, è il job sync; non è il bottone “assegna tratta” del portale.

### 2. Pulsanti Salva / Indietro / Prossimo in basso — **UI wizard, aperto**

Richiesta di layout ScriptCase (toolbar). Non è logica PHP; va fatta in design form wizard.

### 3. Scadenze ANGA / RENTRI / Albo bloccate — **fatto** (nov 2026)

- Solo **subvettore** (group 2 / wizard): autofill + readonly + forza in onValidate.
  - Ricevuta pagamento ANGA* → 30 aprile
  - Ricevuta pagamento RENTRI* → 30 aprile
  - Ricevuta … Albo … conto terzi → 31 gennaio
- Operatori: campo libero. Logica inline negli eventi (niente libreria esterna).

### 4. Manuale del Vettore non in firma digitale — **da verificare dati, non solo codice**

I “verdi” (`is_readonly=1`) includono Manuale vettore: lo slot nasce se esiste il tipo e il file è stato caricato dall’operatore. Briefing 21/10: *presa visione già in piedi; mancano file privacy/231*. Se in prova non vedono il Manuale, cause tipiche:
- riga `documenti` senza `file` (operatore non ha caricato il PDF master)
- tipo non creato per quel subvettore nello step firme
- filtro grid firme su `is_readonly=1` senza file → nascosto / non firmabile

Non è detto che “il flusso firma non mostri il Manuale” in assoluto: spesso manca il file master.

### 5. Notifica portale a fine wizard — **mail sì, campanella in corso / bug SC**

`web_hook_firma` → `webhook_notify_ops_wizard_complete`: **mail** ops (gruppi 1/3/5) + tentativo **`sc_send_notification`**. Flavia conferma la mail e dice di non ricevere comunicazione sul portale: coerente con i bug `function_exists('sc_send_notification')` / macro in function che abbiamo appena corretto su expiry e da verificare se il webhook UAT ha la versione con notifica SC funzionante. **Non è assente dal design:** manca deploy/fix campanella.

### 6. PGL: niente in DOCUMENTAZIONE e TRATTE dopo registrazione — **da chiarire cosa intendono**

Possibili cause (non mutuamente esclusive):
- **DOCUMENTAZIONE:** filtri grid (solo certi stati / solo doc “aziendali”); subvettore appena wizard-complete ma documenti ancora legati al flusso wizard; utenza PGL senza privilegi sulla riga.
- **TRATTE “che gli sono state assegnate”:** se la sync/tratte non ha ancora scritto `tratte` per quel `subvettore_id`, la sezione è vuota a ragione. Contraddice un po’ il punto 1 (sync solo con tratta): se le tratte “sono state assegnate” ma non si vedono, è filtro/UI o subvettore_id diverso dal record sync.
- Abilitazione account (`active`) post-wizard: alcune viste PGL mostrano solo subvettori abilitati.

Va chiesto **codice SGA / id subvettore** della prova e uno screenshot filtri.

### 7. Contratto: non si può visionare prima dell’invio — **plausibile**

In `grid_contratti_onRecord`, `show_contract_signed` compare soprattutto con PDF già generato / stati post-firma (`easygn_file_id` / completato). In bozza / pre-magic-link spesso c’è `send_magic_link` / `select_new_contract` ma **non** anteprima PDF se `{file}` è ancora vuoto (il PDF nasce dopo generazione EasyGN / template). Richiesta legittima: preview bozza (report PDF contratto) **prima** del magic link. Non confondere con “show_contract_signed” post-firma.

### 8. Contratto inviato ma non ricevuto dal vettore — **da log, non assioma**

Flusso: `send_magic_link_to_subvector` → PEC/email rappresentante. Cause tipiche già viste: PEC errata/assente, SMTP, link a ambiente sbagliato, stato contratto che nasconde il resend. **Non** conclude che “l’invio non funziona”: serve log `MAGIC_LINK` / mail di quel contratto e destinatario usato. Oggi (29/10) su UAT il magic link review + mail operatori risultava nei log; l’invio **al vettore** è un altro pezzo (PEC).

### 9. Video tutorial — **fuori codice** (Erik)

### 10. Incontro in presenza — **organizzativo**

---

## Sintesi priorità suggerite

| # | Punto Flavia | Stato lettura tecnica |
|---|---|---|
| A | Sync anagrafica ≠ tratte | Requisito noto D9; ancora da chiudere lato prodotto |
| B | Toolbar wizard in basso | UI SC |
| C | Readonly scadenze ANGA + RENTRI + Albo 31/01 | ANGA auto ok; manca lock + altri due tipi |
| D | Manuale in firma | Verificare file master su tipi readonly |
| E | Campanella fine wizard | Codice presente; fix SC notifica da confermare in UAT |
| F | Doc/Tratte vuoti lato PGL | Indagine dati/filtri sul vettore di prova |
| G | Preview contratto pre-invio | Gap reale UI |
| H | Vettore non riceve contratto | Diagnosi mail/PEC su caso concreto |

---

## Riferimenti

- Call Erik 30/10 (priorità + action): `pigliacelli_briefing_sal_2026-10-30.md`
- Mail precedente: `mail_flavia_prova_2026-10-19.md`
- Sync spezzata: `pigliacelli_briefing_sal_2026-09-30.md` (D9–D12)
- ANGA/RENTRI: `chiarimento_anga_rentri_2026-09-17.md`, `docs_elenco_documenti_subvettori.md`
- Notifica wizard: `grid_documenti_to_sign_wizard_btn_invia_attivazione` (campanella + mail)
