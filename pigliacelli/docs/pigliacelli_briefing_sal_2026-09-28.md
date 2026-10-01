# Briefing e SAL — 28 settembre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL* (28/09/2026, 15:00 CEST)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originali:** [`pigliacelli_briefing_sal_2026-09-28.docx`](pigliacelli_briefing_sal_2026-09-28.docx) · [`pigliacelli_briefing_sal_2026-09-28.txt`](pigliacelli_briefing_sal_2026-09-28.txt)

Vedi anche: [`pigliacelli_briefing_sal_2026-09-30.md`](pigliacelli_briefing_sal_2026-09-30.md) · [`pigliacelli_briefing_sal_2026-09-16.md`](pigliacelli_briefing_sal_2026-09-16.md) · [`chiarimento_anga_rentri_2026-09-17.md`](chiarimento_anga_rentri_2026-09-17.md)

Questa call è l’elenco delle fix da chiudere sul wizard. Su **dove** si caricano ANGA e RENTRI prevale sul SAL 16/09 e sulla mail 17/09: i flag restano sul mezzo, i file vanno nello step documenti aziendale.

---

## Riepilogo call

- Deploy e test UAT del flusso creazione subvettore + credenziali (mail HTML) già fatti da Davide.
- Anagrafica: blocchi distinti **dati sociali** / **legale rappresentante**; simbolo € sui campi economici; validare IBAN e codice destinatario.
- Autisti e mezzi: documento e scadenza raggruppati; ID mezzo nascosto in griglia; modello mezzo già tolto (si ricava dalla carta di circolazione); autista sul mezzo facoltativo.
- **ANGA e RENTRI non si caricano sul mezzo.** Sul mezzo restano i radio di categoria. Nello step documenti il sistema chiede i file in base all’unione delle categorie di tutti i mezzi.
- La dichiarazione (in call: **Allegato E**) diventa uno **step del wizard** a pagina intera, dopo autisti e mezzi e prima di upload documenti e firma.
- Upload documenti del subvettore: **griglia editabile**, senza modale. L’utente non può cancellare le righe. File e data di scadenza obbligatori.
- Le viste statiche del wizard vanno in **griglia**, così non ricompaiono avanti/indietro della form.
- Verifica interna **mercoledì** (richiamo alle 17:00). Credenziali ai clienti **giovedì**, se il controllo è ok.
- Licenza Scriptcase in scadenza tra 7–8 giorni: Erik avvisa Francesco.
- I tre PDF definitivi (231 / etico / privacy) li deve ancora consegnare il cliente.

---

## Decisioni concordate

| # | Decisione | Impatto |
|---|-----------|---------|
| D1 | Anagrafica divisa in due blocchi: dati sociali e legale rappresentante | Step anagrafica wizard |
| D2 | Campi economici con simbolo **€** | Form dichiarazione / fatturati |
| D3 | Validare **IBAN** (regex) e **codice destinatario** (7 caratteri alfanumerici) | Anagrafica |
| D4 | Documento e scadenza nello stesso blocco (patente, CQC, formazione, carta circolazione) | Form autisti e mezzi |
| D5 | Sul mezzo restano solo i radio categoria 1/4/5. Via gli upload ANGA e RENTRI | `form_subvettori_mezzi` |
| D6 | I file ANGA/RENTRI si chiedono nello **step documenti**, a livello azienda, in base alle categorie presenti su almeno un mezzo | `form_documenti_wizard` |
| D7 | Unione categorie: se i mezzi coprono più categorie, una autorizzazione e una ricevuta per ciascuna categoria presente, e **una sola** coppia RENTRI | Slot `documenti` con mezzo/autista vuoti |
| D8 | File e data di scadenza obbligatori su quegli slot. Il subvettore **non elimina** le righe | onValidate + pulsanti form |
| D9 | Upload documenti subvettore da **griglia editabile**, senza aprire la modale. La modale resta solo dove serve all’operatore Pigliacelli | Form documenti wizard |
| D10 | Dichiarazione (**Allegato E** in call) = step wizard dedicato, **a pagina intera**, dopo autisti e mezzi, prima dell’upload e della firma | Ordine wizard |
| D11 | Quali campi del questionario sono obbligatori lo dice il cliente. Fino ad allora una parte è obbligatoria e una no | Form dichiarazione |
| D12 | Viste del wizard in **griglia**, non form, per non rivedere i pulsanti di navigazione | Grid al posto delle form di sola lettura |
| D13 | Chiusura fix wizard entro **mercoledì**; credenziali di prova **giovedì** | Pianificazione |

### ANGA / RENTRI — regola della call

I flag sul mezzo dicono a quale categoria è associato il veicolo. Il PDF è dell’azienda.

- Al passaggio successivo il sistema legge tutti i mezzi.
- Per ogni categoria presente almeno una volta: chiede autorizzazione e ricevuta.
- Se c’è almeno una categoria 1, 4 o 5: una iscrizione RENTRI e una ricevuta RENTRI, una volta sola.
- Esempio detto in call: mezzi su più categorie → tutte le ricevute di quelle categorie e una sola RENTRI. Cinque mezzi tutti in categoria 4 → una categoria 4 e una RENTRI.
- La scadenza la compila il subvettore nello step documenti, insieme al file.
- Proposta scartata: caricare ANGA sul mezzo e poi cancellare i doppioni.

### Ordine wizard concordato

1. Anagrafica  
2. Autisti  
3. Mezzi (radio categorie, carta di circolazione; niente upload ANGA/RENTRI)  
4. Compilazione dichiarazione (Allegato E), pagina intera  
5. Upload documenti (inclusi gli slot ANGA/RENTRI generati dalle categorie)  
6. Firma documenti

---

## Fix da fare

### Digiweb (Davide)

| Priorità | Fix |
|----------|-----|
| **Entro mercoledì** | Togliere upload ANGA/RENTRI dal mezzo; lasciare i radio |
| **Entro mercoledì** | Allo step documenti, creare gli slot aziendali dall’unione delle categorie dei mezzi |
| **Entro mercoledì** | File + data scadenza obbligatori; niente cancellazione righe da parte del subvettore |
| **Entro mercoledì** | Spostare la dichiarazione in uno step wizard a pagina intera, prima dei documenti e della firma |
| **Entro mercoledì** | Due blocchi in anagrafica (società / rappresentante) |
| **Entro mercoledì** | Griglia editabile per il caricamento documenti, senza modale |
| Upload | Raggruppare documento + scadenza su autisti e mezzi |
| Upload | Simbolo € sui campi economici |
| Upload | Regex IBAN e codice destinatario |
| Da chiedere | Elenco campi obbligatori del questionario (a Pigliacelli) |
| Backlog | Tre PDF definitivi quando arrivano |
| Backlog | Parte contratti, dopo l’onboarding |

### Erik

| Attività |
|----------|
| Avvisare Francesco: licenza Scriptcase in scadenza tra 7–8 giorni |
| Richiamo di controllo mercoledì alle 17:00, poi invio credenziali giovedì |

---

## Annotazioni, non decisioni

- Polizza: in form c’è la scadenza assicurazione e non il file. Erik: ogni mezzo ha la sua polizza, ma il cliente non l’ha chiesta. Non è una fix di questa call.
- DURF e polizza risultano obbligatori nel flusso visto in demo. Davide li vedrebbe più coerenti sul veicolo; non è stato dato un ordine di spostarli.
- Pulsanti avanti/indietro: Erik suggerisce una variabile globale o l’evento menu `sc_menu_item` azzerato all’apertura del menu. Davide non usa il menu standard dentro il wizard; le viste in griglia sono la strada scelta per non rivedere quei pulsanti.
- Certificato UAT assente: il browser blocca l’autocompilazione. Non è una fix applicativa.
