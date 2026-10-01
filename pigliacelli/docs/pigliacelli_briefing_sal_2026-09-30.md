# Briefing e SAL — 30 settembre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL* (30/09/2026, 17:02 CEST)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originali:** [`pigliacelli_briefing_sal_2026-09-30.docx`](pigliacelli_briefing_sal_2026-09-30.docx) · [`pigliacelli_briefing_sal_2026-09-30.txt`](pigliacelli_briefing_sal_2026-09-30.txt)

Vedi anche: [`pigliacelli_briefing_sal_2026-09-28.md`](pigliacelli_briefing_sal_2026-09-28.md)

Demo del wizard in UAT. Le fix ANGA/RENTRI e lo step dichiarazione del 28/09 restano valide e in call risultano già fatte. Questa call chiude i ritocchi prima dei test clienti (venerdì mattina) e fissa come funziona la sincronizzazione SGA e la firma contratti.

---

## Riepilogo call

- Flusso wizard mostrato in incognito con subvettore nuovo: credenziali, anagrafica a blocchi, mezzi con categorie, dichiarazione che crea gli slot documenti, upload multirecord, firma.
- Mancano ancora validazione **IBAN** e **codice destinatario** (in call: codice SD). Vanno sulla maschera del campo.
- Anno immatricolazione dei mezzi diventa **data di immatricolazione**. Nascondere l’ID.
- Gli slot da questionario (ISO, SQAS, diagnosi energetica e attestazione ENEA) sono corretti anche se il cliente non li ha elencati a parte.
- Upload documenti resta **multirecord** con drag and drop. Il Salva lì serve. Sulla dichiarazione il Salva si può togliere: il Prossimo salva già.
- Informativa privacy: form esplicita, **non** un nuovo step del wizard (rinumerare gli step è troppo costoso). Va nello stesso flusso.
- Manca il tasto per aprire il documento firmato: oggi c’è solo l’anteprima.
- Menu: sotto **Anagrafica azienda** va **Dettagli subvettore**. Tratte e documenti vanno sotto **contratti**, non sotto l’anagrafica. Le dichiarazioni restano una sezione a parte.
- In griglia autisti e mezzi, al posto del nome file («Blank…») un’**icona spunta** che apre il documento in una nuova finestra.
- Sincronizzazione SGA da **nascondere subito**, prima che i clienti entrino. Poi due pulsanti distinti: uno in anagrafica vettori, uno nelle tratte. Non nel menu principale.
- Il job tratte pesca i viaggi di **tutti** i subvettori in anagrafica, attivi o no. Si tengono tutti in memoria.
- Firma contratto: se il subvettore ha finito il wizard e non ha mai avuto tratte, alla sync si crea il contratto in bozza e l’operatore lo invia. Se ha già tratte, solo l’allegato di variazione della tratta nuova.
- Il form di firma mostra **solo le tratte** (sola lettura). Autisti e mezzi non sono più step di quel wizard: si gestiscono in anagrafica, con gli stessi controlli documenti del wizard (inclusi gli slot ANGA se compare una categoria nuova).
- Per i subvettori vecchi: pulsante **Nuovo contratto quadro** in contrattistica. Si selezionano il vettore e tutte le sue tratte, e si rifirma.
- Reminder già abbozzati: vanno completati con dichiarazioni e moduli annuali, poi testati.
- Rinnovo dichiarazione annuale: nuova riga in bozza, compilazione e firma dalla sezione dichiarazioni (non via mail con il form). La firma va al legale rappresentante indicato in anagrafica.
- Database da ripulire prima dei test. Erik avvisa che da **venerdì mattina** possono provare; giovedì verso le 17 chiede conferma a Davide. Testo mail (una sola) e registrazione li manda Erik.

---

## Decisioni concordate

| # | Decisione | Impatto |
|---|-----------|---------|
| D1 | Validare IBAN e codice destinatario con la maschera del campo | Anagrafica |
| D2 | Anno immatricolazione → data di immatricolazione. Nascondere l’ID | Mezzi / anagrafica |
| D3 | Slot certificati dal questionario (ISO, SQAS, diagnosi + ENEA) restano | Step documenti |
| D4 | Informativa privacy in un form esplicito, nello stesso flusso, senza un nuovo numero di step | Wizard |
| D5 | Tasto per aprire il documento già firmato | Step firma |
| D6 | Menu: Anagrafica azienda → Dettagli subvettore. Tratte e documenti sotto contratti | Menu area riservata |
| D7 | Griglia autisti e mezzi: icona spunta al posto del nome file; il click apre il file in una nuova finestra | Grid autisti e mezzi |
| D8 | Nascondere subito il pulsante unico di sync SGA | Menu, prima dei test |
| D9 | Due sync SGA manuali: anagrafica vettori (importa/aggiorna e fa partire l’onboarding) e tratte | `form` anagrafica e tratte |
| D10 | Il job tratte legge tutti i subvettori in anagrafica, attivi e non | Job SGA |
| D11 | Sync tratte + wizard completo + zero tratte precedenti → contratto principale in bozza. Sync + tratte già presenti → solo allegato di variazione della tratta nuova | Contrattistica |
| D12 | Il contratto quadro, in firma, mostra tutte le tratte dall’inizio. La variazione mostra solo la tratta nuova. Griglia in sola lettura | Form firma |
| D13 | Il sistema crea i record. L’operatore, da contrattistica, invia la mail alla PEC. Firma il legale rappresentante | Invio firma |
| D14 | Togliere gli step autisti e mezzi dal wizard di firma. Stessi controlli (patente, ANGA, …) quando si aggiunge o si modifica un autista o un mezzo in anagrafica | Anagrafica post-wizard |
| D15 | Pulsante Nuovo contratto quadro per i vettori già esistenti: si scelgono vettore e tutte le tratte, si rifirma | Form contrattistica |
| D16 | Reminder: includere dichiarazioni e documenti annuali | Notifiche |
| D17 | Rinnovo annuale della dichiarazione: si compila e si firma dalla sezione dichiarazioni | `grid` dichiarazioni |
| D18 | Test clienti da venerdì mattina. DB pulito prima. Conferma giovedì verso le 17 | Pianificazione |

### Sync SGA — regola della call

Due azioni, tutte e due manuali (il job automatico delle tratte resta, ma l’input operativo è il pulsante).

- **Anagrafica vettori:** importa i subvettori che non ci sono e aggiorna quelli già presenti (mail, sede, …). I nuovi partono con l’onboarding.
- **Tratte:** scarica i viaggi di tutti i subvettori in anagrafica. Controlli già previsti (partenza, fine, prezzo, …). A video: un resoconto (quante sincronizzate, modificate, nuove, quanti allegati di variazione, quanti contratti nuovi).

Dopo la sync delle tratte:

- Subvettore con wizard completato e **nessuna tratta prima**: si crea il contratto principale in bozza. L’operatore lo trova in contrattistica e preme invio. La mail va alla PEC. Il legale rappresentante indica nome, cognome, email e telefono e firma, come già avviene.
- Subvettore che **ha già tratte**: solo l’allegato della tratta nuova. In firma vede solo quella.
- Contratto quadro (prima firma, o rifirma per i vecchi): in firma si vedono tutte le tratte dall’inizio.
- Non si crea più tutto in automatico all’import: l’operatore dà l’input di sincronizzare.

### Firma e anagrafica dopo il wizard

Autisti e mezzi non si ricompilano nel wizard di firma. Si confermano o si modificano in anagrafica.

- Aggiungere o modificare un autista richiede gli stessi documenti del wizard (patente e gli altri già previsti).
- Aggiungere un mezzo con una categoria ANGA mai caricata crea lo slot aziendale in documenti, come già fa il wizard. Va replicato anche fuori dal wizard.
- Il form di firma non mostra più gli step autisti e mezzi: solo la griglia tratte, senza modifica.

---

## Già visto in demo (fatto)

- Anagrafica a blocchi.
- Categorie 1/4/5 sui mezzi e slot ANGA/RENTRI senza doppioni.
- Dichiarazione che, al salvataggio, crea gli slot ISO / SQAS / diagnosi / ENEA.
- Caselle PDF delle parentesi quadre sistemate.
- Documenti in multirecord, drag and drop.
- Sezione dichiarazioni: firmata in sola lettura; alla scadenza nasce una bozza dell’anno nuovo da compilare e rifirmare da lì.
- Raggruppamento documento + scadenza su autisti; spostamento ANGA/RENTRI e allegato E considerati fatti da Erik.

---

## Fix da fare

### Digiweb (Davide)

| Priorità | Fix |
|----------|-----|
| **Prima dei test** | Nascondere la sync SGA unica |
| **Prima dei test** | Pulire il database |
| **Prima dei test** | Maschera IBAN e codice destinatario |
| **Prima dei test** | Data immatricolazione al posto dell’anno; nascondere l’ID |
| Subito dopo | Icona spunta al posto del nome file (autisti e mezzi), apertura in nuova finestra |
| Subito dopo | Voce menu Anagrafica azienda / Dettagli subvettore; tratte e documenti sotto contratti |
| Subito dopo | Form informativa privacy nello stesso flusso, senza nuovo step |
| Subito dopo | Tasto per aprire il documento firmato |
| Poi | Due pulsanti sync SGA (anagrafica e tratte) e resoconto a fine sync tratte |
| Poi | Job tratte su tutti i subvettori; bozza contratto o solo variazione secondo la regola sopra |
| Poi | Wizard di firma ridotto alle tratte; controlli documenti anche in modifica anagrafica |
| Poi | Pulsante Nuovo contratto quadro per i vettori vecchi |
| Poi | Reminder con dichiarazioni e documenti annuali |

### Erik

| Attività |
|----------|
| Mandare il testo dell’unica mail |
| Mandare la registrazione della call |
| Scrivere ai clienti che da venerdì mattina possono testare; giovedì verso le 17 chiedere conferma a Davide |
| Fare una pianificazione con scadenze sulle attività successive |

---

## Annotazioni, non decisioni

- Polizza sul mezzo: Davide si aspetta che la chiedano. In call non è diventata una fix.
- Il Salva della dichiarazione si può togliere. Il Salva dei documenti multirecord resta.
- Le password degli step successivi arrivano via SMS.
- Passo 5 in carica da modale e passo 6 risultano a posto per Erik; la dashboard resta dopo.
- Per provare i job senza interrogare sempre SGA si possono riusare i viaggi finti. I test veri li farà anche il cliente.
