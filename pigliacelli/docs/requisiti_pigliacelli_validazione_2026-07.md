# Requisiti Pigliacelli — validazione email luglio 2026

Documento di recap delle specifiche **congelate** emerse dagli scambi email con il cliente (Flavia / Pigliacelli).  
Da usare come riferimento per sviluppi futuri. Ultimo aggiornamento: **16 luglio 2026**.

---

## Contesto

Il cliente ha chiesto di **congelare i requisiti operativi** per poter finalizzare il rilascio. Le indicazioni sotto sono da considerare **definitive** salvo esplicita modifica formale successiva.

Distinzione terminologica concordata:

| Termine | Significato |
|---------|-------------|
| **FASI** (1–3) | Flusso onboarding complessivo (credenziali → verifica → contratto) |
| **Step** | Passaggi della procedura di **firma del Contratto Quadro** (erano 3; possibile quarto per upload documenti) |
| **Flusso Iniziale** | Documenti obbligatori caricati dal vettore in **FASE 1** (prima del contratto) |
| **Allegato A** | Documento allegato al contratto con le **prime tratte assegnate** — inviato **una sola volta** insieme al Contratto Quadro |
| **Appendice all'Allegato A** | Documento separato per **nuove tratte** o **modifica tariffe** su tratte esistenti, in vigore di contratto già firmato; numerazione progressiva per ordine di invio |

---

## FASI del flusso (definitive)

### FASE 1 — Onboarding vettore

1. Il vettore riceve per email le **credenziali**.
2. Accede al portale e compila l’**anagrafica**.
3. Carica i documenti del **Flusso Iniziale** (incluso **DURF** — aggiunto in ultima risposta).
4. Inserisce **autisti e automezzi** (sezioni accorpate nel portale, vedi sotto).
5. Firma **digitalmente** su piattaforma (non più download + firma analogica + scansione): Dichiarazioni, Privacy, Manuale Vettore, Codice Etico, Mod. 231.

### FASE 2 — Verifica operatore e invio contratto

1. Gli **operatori Pigliacelli** verificano i documenti del Flusso Iniziale.
2. Assegnano la/e **tratta/e** (rilevamento via monitoraggio SGA).
3. Inviano al vettore via portale/PEC il **Contratto Quadro** con:
   - **Allegato A** (popolato con tratta/e, merce, caricatore, proprietario, tariffa),
   - **Allegato B** (autisti / automezzi).

### FASE 3 — Firma contratto e documentazione residua

1. Il vettore firma **digitalmente** il Contratto Quadro (Allegati A e B).
2. Carica i documenti **non** compresi nel Flusso Iniziale (es. patenti autisti, carte di circolazione, idoneità sanitaria, attestati formazione DPI III categoria, ecc.).

---

## Punto 1 — Contratto Quadro e Allegato A

**Validazione cliente: SÌ** (confermato).

### Regole

- La **creazione del nuovo vettore** è **sganciata** dall’assegnazione della prima tratta.
- Il **Contratto Quadro** (con Allegato A popolato e Allegato B) si crea **solo dopo**:
  1. Verifica documenti Flusso Iniziale (FASE 1 completata),
  2. Rilevamento di **una o più nuove tratte** tramite procedura di monitoraggio SGA,
  3. Assegnazione tratta/e al subvettore.
- **Non** si genera più il contratto in automatico al solo inserimento anagrafico / prima tratta senza passaggio da verifica documenti.
- L’**Allegato A** contiene le prime tratte assegnate al momento dell’invio del contratto.
- Per **nuove tratte successive** (o modifica tariffe su tratte esistenti) con contratto già in vigore: si invia **Appendice all’Allegato A** (numerata progressivamente), **non** un nuovo Allegato A integrale.

### Domanda aperta lato fornitore (da chiarire in call se serve)

- Se al momento dell’invio contratto non ci sono ancora tratte: scenario da escludere nel flusso concordato (il contratto parte solo dopo assegnazione tratta/e).

---

## Punto 2 — Documenti in fase Contratto Quadro e upload

**Validazione cliente: SÌ** — con precisazioni.

### Tipologie multi-file

- Le tipologie documentali della FASE 3 (e/o step firma contratto) possono prevedere **più file** (es. più patenti, più carte di circolazione).

### Collegamento con Allegato B

- **In linea di massima** i documenti sono collegati a quanto indicato nell’Allegato B (autisti → patenti; automezzi → carte di circolazione).
- **Ma** il vettore deve poter caricare un **numero maggiore** di documenti rispetto all’Allegato B (es. più mezzi che autisti → più carte di circolazione che patenti).
- **Non** imporre vincolo rigido 1:1 obbligatorio con le righe Allegato B; usare collegamento logico + flessibilità.

### Step firma Contratto Quadro

- La procedura di firma del Contratto Quadro aveva **3 step**.
- Se si prevede **upload documenti** durante/compiendo la firma del contratto, serve un **quarto step** dedicato.
- Il cliente chiede chiarimento su **“a cosa fa riferimento l’upload”**: intendono la possibilità di caricare file sul portale durante il wizard di firma contratto (da confermare esplicitamente in risposta).

### Implicazione architetturale documenti

- Modello **N documenti per tipo** (non una sola riga per `tipo_documento_id`).
- Possibile collegamento opzionale a `subvettori_autisti` / mezzi per tracciabilità, senza vincolo rigido di conteggio.

---

## Punto 3 — Polizza vettoriale e quietanza

### Polizza RCA

- **Unica polizza obbligatoria**: RCA (Flusso Iniziale).
- Altre polizze: caricate **solo se possedute** (flag “in possesso” → upload obbligatorio se sì).

### Quietanza

- Aggiungere documento **“quietanza”** per **ogni polizza** caricata.
- La quietanza va **rinnovata alla scadenza** della polizza.
- La polizza **non** è legata alla firma di un nuovo Allegato A / Appendice.
- **Nuovo requisito** (rispetto a precedente chiarimento): quietanza richiesta anche in caso di **invio documentazione successiva in corso di validità del contratto** (come da Excel cliente) — da implementare nel flusso di rinnovo/scadenza documenti.

---

## Punto 4 — Digitalizzazione, firme, allegati

### Firma digitale onboarding

- **Confermato**: firma digitale su piattaforma per documenti onboarding (no firma analogica + scansione).

### Documenti forniti dal cliente

- In allegato email: **Dichiarazioni**, **Manuale vettore**, **elenco autisti/mezzi** (file unico).
- **Privacy, Codice etico, Mod. 231**: in implementazione lato cliente; chiedono se possono **caricarli autonomamente** sul portale quando pronti → **da abilitare** (backoffice / upload template).

### Accorpamento autisti / automezzi

- Originariamente due allegati separati; ora **un unico file** lato cliente.
- Sul portale: **accorpare nelle relative sezioni** (autisti e automezzi nello stesso wizard/step Allegato B, non due flussi allegati distinti).

### DURF

- **Nuovo documento obbligatorio** nel **Flusso Iniziale** (FASE 1).

---

## Documenti non obbligatori (es. iscrizione ANGA)

- Campo in cui il vettore indica se **è in possesso** o meno del documento.
- Se risposta **affermativa** → upload **obbligatorio**.
- **Storicizzazione**: la scelta (sì/no + eventuale data) deve essere **registrata e consultabile** nella scheda del subvettore (audit trail, non solo stato corrente).

---

## Alert scadenze documenti

- Destinatari: **solo operatori** (elenco operatori da definire dal cliente).
- Tempistiche/frequenze: cliente invierà **file dedicato** con le indicazioni.
- Stato attuale sistema: configurazione “standard” in attesa del file.

---

## Sincronizzazione SGA

**Confermato** — entrambe le modalità dove indicato:

| Area | Manuale | Automatica |
|------|---------|------------|
| **TRATTE** (creazione Appendice) | Sì | — |
| **ANAGRAFICA** (email, PEC, ecc.) | Sì | **1 volta al giorno** |

La sincronizzazione manuale **non esclude** quella automatica.

---

## Riepilogo nuovi requisiti / variazioni rispetto a sviluppo precedente

| # | Requisito | Impatto stimato |
|---|-----------|-----------------|
| 1 | Contratto Quadro solo post-verifica doc + assegnazione tratta SGA | `check_new_trips`, wizard, stati subvettore |
| 2 | Distinzione Allegato A (una tantum) vs Appendice (progressiva) | WF contratto, PDF, numerazione appendici |
| 3 | Flusso Iniziale include **DURF** | `tipi_documento`, bootstrap documenti obbligatori |
| 4 | Documenti FASE 3 **multi-file** per tipo | Modello `documenti`, UI master-detail, no UNIQUE per tipo |
| 5 | Collegamento logico Allegato B, senza vincolo 1:1 rigido | Validazione soft, FK opzionali autista/mezzo |
| 6 | Possibile **4° step** upload in wizard firma contratto | EasyGN / wizard contratto |
| 7 | **Quietanza** per ogni polizza + rinnovo a scadenza | Tipi documento, alert, upload successivo a contratto |
| 8 | Polizze facoltative con flag “in possesso” | UI + storicizzazione scelta |
| 9 | Firma digitale documenti onboarding (non scansione) | EasyGN / moduli firma |
| 10 | Cliente carica Privacy / Codice etico / 231 quando pronti | Backoffice template documenti |
| 11 | Autisti + automezzi accorpati in sezioni portale | Form wizard, Allegato B, PDF |
| 12 | Storicizzazione dichiarazioni possesso documenti | Nuova tabella o log audit su subvettore |
| 13 | Alert solo operatori (file tempistiche in arrivo) | `send_expired_doc_alert`, config |
| 14 | Sync anagrafica SGA giornaliera + manuale | Job schedulato + pulsanti UI |

---

## Elenco documenti sub-vettori

Vedi file dedicato: [`docs_elenco_documenti_subvettori.md`](../docs_elenco_documenti_subvettori.md) — 25 tipologie con regole alert e classificazione Flusso Iniziale / FASE 3.

## Briefing SAL 21 luglio 2026

Vedi [`pigliacelli_briefing_sal_2026-07-21.md`](pigliacelli_briefing_sal_2026-07-21.md) — presa visione, quietanza, flag tipi documento, autisti/mezzi separati, job email.

## Modello flag documenti

Vedi [`modello_flag_documenti.md`](modello_flag_documenti.md) — dove mettere `mandatory`, `precarica`, presa visione, “in possesso”, quietanza collegata.

---

## Elementi ancora in sospeso / da ricevere dal cliente

- [x] Elenco tipologie documentali con tempistiche alert → `docs_elenco_documenti_subvettori.md`
- [ ] File con **tempistiche alert** per categoria documento (formalizzazione operativa / destinatari operatori).
- [ ] Elenco **operatori** destinatari alert.
- [ ] Conferma esplicita su **“upload”** nel wizard firma contratto (4° step).
- [ ] File **Privacy, Codice etico, Mod. 231** (quando pronti).
- [ ] Elenco definitivo tipologie **Flusso Iniziale** vs **FASE 3** (con Excel aggiornato post-DURF e quietanza).

---

## Note per implementazione documenti (collegamento a decisioni tecniche)

Vedi [`modello_flag_documenti.md`](modello_flag_documenti.md) per il dettaglio completo.

- **`tipi_documento`** (aggiunti ora): `is_readonly`, `flag_possesso`, `tipo_collegato_id` — **no** `tipo_padre_id` / **no** enum `modalita`
- **`documenti`** (da aggiungere): `presa_visione_at`, `in_possesso`, `documento_padre_id`
- **Storicizzazione possesso**: `subvettore_dichiarazioni_documento` (consigliata)
- **Due sottoaree UI**: `is_readonly=0` caricare / `is_readonly=1` visionare

---

*Fonte: email di validazione requisiti Pigliacelli, luglio 2026 (thread Flavia / freeze specifiche).*
