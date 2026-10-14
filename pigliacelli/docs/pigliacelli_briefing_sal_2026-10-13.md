# Briefing e SAL — 13 ottobre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL* (13/10/2026, 12:10 CEST)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originali:** [`pigliacelli_briefing_sal_2026-10-13.docx`](pigliacelli_briefing_sal_2026-10-13.docx) · [`pigliacelli_briefing_sal_2026-10-13.txt`](pigliacelli_briefing_sal_2026-10-13.txt)

Vedi anche: [`pigliacelli_briefing_sal_2026-09-30.md`](pigliacelli_briefing_sal_2026-09-30.md)

Demo del flusso contratti su un subvettore reale (3BF) dopo la sync tratte, e revisione delle fix chieste dal cliente sul questionario e sui documenti. Le regole di sync e di firma del 30/09 restano. Questa call stringe la schermata operatore, la revisione del subvettore, i controlli prima dell’invio e la griglia documenti.

---

## Riepilogo call

- Job tratte mostrato su **3BF** (subvettore reale, zero tratte importate): sync, contratto quadro nuovo, tratte in contrattistica.
- Vista operatore del contratto: solo **ragione sociale, partita IVA e PEC**, in sola lettura, più a tutto schermo. I dati generali dell’anagrafica non si mostrano.
- Il mittente delle mail è una **PEC di Pigliacelli** (la devono dare loro). Il contratto va alla PEC del subvettore. Le credenziali vanno alla mail del subvettore, non alla PEC. Il link di firma del rappresentante legale va alla sua email.
- In demo è partita la mail credenziali per sbaglio (mail di prova uguali). La PEC del contratto, ricontrollata, era instradata bene.
- Revisione subvettore: solo le **tratte**, sola lettura. Testo informativo in testa. Pulsanti **Accetta e invia per la firma** e **Rifiuta** sopra e sotto. Il rifiuto chiede una nota. Rifiutare qui blocca il contratto; è distinto dal rifiuto in fase di firma.
- Al click su Accetta si apre una modale con **nome, cognome, email e telefono** del rappresentante legale, da confermare. Non si mostrano subito sul form. I dati si prendono dall’anagrafica. I residui del vecchio form `subvettori_contratti` vanno tolti (bug: il rappresentante restava vuoto o arrivava dalla tabella vecchia).
- Nella stessa schermata, anteprima **PDF** del contratto (pulsante, poi Erik preferisce il PDF già aperto sotto le istruzioni). Non nella mail. Le tratte da sole non bastano, perché il subvettore non modifica nulla.
- L’SMS in inglese è l’ambiente di test EasyGN. In produzione è in italiano. Non è un fix.
- La mail di firma al committente **non parte da sola**. Arriva la notifica all’operatore, e l’operatore invia. **Marcello Pigliacelli** ha una voce di menu sotto contrattistica, solo i contratti da firmare, con un tasto che apre il link. Gli admin inviano la mail; non firmano al posto suo.
- I due sync stanno sulle schermate: tratte sulla schermata tratte, subvettori sulla schermata subvettori. Si possono aprire in modale.
- **Nuovo contratto quadro** (demo Ecologia, 6 tratte): in elenco solo chi non ha già un tipo 1. Prima dell’invio, blocco se `wizard_complete` non è 1, con messaggio. Stessi controlli (PEC valida e dati fondamentali) anche sul contratto creato dal job.
- Questionario: fax e responsabili (nomi e telefoni) non più obbligatori. White list documento obbligatorio. Già fatto.
- Documenti: si torna alla **editable grid** (double grid), com’era all’inizio. Non si cancella la riga; si può sostituire il file. In modale niente Avanti e Prossimo; Chiudi modale sì. In griglia i tasti di step. `in_possesso` non deve riapparire dopo il Salva.
- Fix documenti da chiudere in giornata. Entro le 18 Davide manda la mail a Erik, che risponde al cliente. Test sul dev. Venerdì pomeriggio si rilascia anche il flusso subvettori/tratte per i test veri.
- Documenti che il cliente deve fornire per lo step di firma: **manuale del vettore, modulo 231, codice etico, informativa privacy** (codice etico e mod. 231 nel testo del cliente possono essere una cosa sola). Quella parte è ancora da sviluppare. Elenco a Erik nel pomeriggio.

---

## Decisioni concordate

| # | Decisione | Impatto |
|---|-----------|---------|
| D1 | Vista operatore: solo ragione sociale, partita IVA, PEC, sola lettura | Form contratto operatore |
| D2 | Revisione subvettore: solo tratte in sola lettura, testo informativo, Accetta e invia per la firma / Rifiuta sopra e sotto. Il rifiuto chiede una nota | Magic link review |
| D3 | Modale di conferma del rappresentante legale (nome, cognome, email, telefono) solo al click su Accetta. Dati dall’anagrafica | Review, prima della firma |
| D4 | Togliere i residui di `subvettori_contratti` usati al posto dell’anagrafica | Form contratto |
| D5 | Anteprima PDF del contratto nella form di accettazione, non nella mail | Review |
| D6 | Firma committente su input dell’operatore, non automatica. Menu dedicato per Marcello: solo contratti da firmare, link diretto | Contrattistica, menu |
| D7 | Mittente PEC Pigliacelli. Contratto → PEC subvettore. Credenziali → mail subvettore. Link firma rappresentante → sua email | Invii |
| D8 | Pulsante sync tratte sulla schermata tratte; sync subvettori sulla schermata subvettori. Anche in modale | Menu operativo |
| D9 | Invio e creazione contratto bloccati se il wizard non è completo. PEC e dati fondamentali controllati anche sul contratto nato dal job | Nuovo contratto quadro e job |
| D10 | Documenti in editable grid. Niente elimina riga. In modale niente Avanti/Prossimo, sì Chiudi. In griglia i tasti di step | `form_documenti_wizard` |
| D11 | Fax e contatti dei responsabili non obbligatori. White list obbligatoria | Questionario e documenti |
| D12 | Venerdì pomeriggio: rilascio del flusso subvettori/tratte per i test clienti, dopo la prova interna | Pianificazione |
| D13 | Step firma documenti verdi: manuale del vettore, modulo 231, codice etico, informativa privacy. Elenco da mandare a Erik | Step firma, ancora da fare |

### Revisione e firma — regola della call

- Operatore: vede chi è il vettore (ragione sociale, P.IVA, PEC) e le tratte.
- Subvettore, dal link: istruzioni, anteprima PDF, tratte in sola lettura. Accetta o rifiuta.
- Accetta apre la conferma dei quattro dati del rappresentante legale, poi parte la richiesta di firma verso la sua email.
- Rifiuta chiude il contratto e chiede una nota. Non è il rifiuto che avviene dopo, dentro EasyGN.
- Quando il subvettore ha firmato, l’operatore riceve la notifica e invia lui il link al committente. Marcello entra dal suo menu e firma da lì.

### Griglia documenti

Si ripristina la double grid / editable grid.

- Salva sulla riga resta.
- Delete di riga no. Il file si sostituisce.
- Modale di edit: senza Avanti e Prossimo, con Chiudi.
- Griglia: con i tasti di step (Indietro / Prossimo), senza Chiudi modale.
- Dopo il Salva, la colonna In possesso non deve tornare visibile.

---

## Già visto in demo (fatto)

- Sync tratte su 3BF: tipo 1 con tratte nuove in contrattistica.
- Nuovo contratto quadro su un subvettore senza tipo 1 (Ecologia, 6 tratte).
- Fax e responsabili non obbligatori. White list obbligatoria.
- `in_possesso` nascosto dopo il salvataggio del form documenti (visto in call come corretto).
- Notifica “contratto completato” alla mail del subvettore.

---

## Fix da fare

### Digiweb (Davide)

| Priorità | Fix |
|----------|-----|
| **In giornata (13/10)** | Griglia documenti com’era: Chiudi solo in modale, Avanti/Prossimo solo in griglia, niente elimina riga |
| **In giornata** | Mail a Erik entro le 18 sulle fix deployate, così risponde al cliente |
| Subito | Vista operatore ridotta a ragione sociale, P.IVA, PEC |
| Subito | Review: solo tratte, pulsanti sopra e sotto, modale rappresentante legale, anteprima PDF |
| Subito | Instradamento mail: contratto in PEC, credenziali sulla mail, link firma sulla mail del rappresentante. Mittente PEC |
| Subito | Blocco invio/creazione se wizard non completo, anche sul job |
| Subito | Togliere i campi residui di `subvettori_contratti` |
| Poi | Voce menu contratti da firmare per Marcello Pigliacelli |
| Poi | Spostare i pulsanti sync sulle schermate tratte e subvettori |
| Poi | Elenco documenti verdi a Erik; poi lo step di firma (manuale vettore, 231, codice etico, privacy) |

### Erik

| Attività |
|----------|
| Dopo la mail di Davide, riscontro al cliente sulle correzioni |
| Scrivere ai clienti per il rilascio di venerdì pomeriggio (subvettori e tratte) |
| Fissare l’orario della prova di venerdì pomeriggio |

---

## Annotazioni, non decisioni

- Su circa 700 tratte una parte non ha merce, caricatore o proprietario: dati sporchi, il match non chiude. Le rivede il subvettore. Non è una fix di questa call.
- I testi delle mail li darà il cliente. In attesa si mette un testo informativo generico.
- La notifica di contratto completato al subvettore è corretta; non è la mail di firma.
- Testare sul dev. L’UAT si comporta spesso in modo diverso e le fix obbligatorie erano già state deployate senza un giro UAT completo.
- Demo interrotta da un F5 sul nuovo contratto quadro: il flusso era già stato visto funzionare poco prima.
