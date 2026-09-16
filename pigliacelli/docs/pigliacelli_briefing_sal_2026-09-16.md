# Briefing e SAL — 16 settembre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL*  
**Partecipanti:** Flavia Pigliacelli, Davide Marcoccia (Pigliacelli); Davide Chieli, Erik Capoccetta (Digiweb)  
**File originali:** [`pigliacelli_briefing_sal_2026-09-16.docx`](pigliacelli_briefing_sal_2026-09-16.docx) · [`pigliacelli_briefing_sal_2026-09-16.txt`](pigliacelli_briefing_sal_2026-09-16.txt)

Vedi anche: [`requisiti_pigliacelli_validazione_2026-07.md`](requisiti_pigliacelli_validazione_2026-07.md) · [`pigliacelli_briefing_sal_2026-07-21.md`](pigliacelli_briefing_sal_2026-07-21.md) · [`modello_flag_documenti.md`](modello_flag_documenti.md)

---

## Riepilogo call

- Demo del **flusso onboarding** completo (anagrafica → autisti → mezzi → upload doc → firma OTP → invio attivazione).
- Bypass SGA per i test: creazione subvettore manuale + invio credenziali a comando operatore.
- **Modello 231 / codice etico / manuale / privacy definitivi:** Pigliacelli li consegna **ottobre–novembre**; in test restano placeholder / PDF bianchi.
- **Presa visione** documenti di sicurezza: log data/ora (niente marca temporale a pagamento) — ancora in lavorazione.
- Decisione strutturale: **categorie rifiuti / ANGA / carta circolazione** si gestiscono sul **mezzo**, non sull’autista.
- **Allegato F** (questionario qualificazione): flusso di **compilazione dedicato annuale** (non solo PDF statico), storico dati (es. fatturato rolling 3 anni).
- Target correzioni minori: **venerdì** (settimana della call); DB azzerato per test cliente da giorno successivo.

---

## Decisioni concordate

| # | Decisione | Impatto |
|---|-----------|---------|
| D1 | Presa visione certificata con **log data/ora** (no timestamp a pagamento) | Audit trail documenti “da visionare” |
| D2 | **Scadenza obbligatoria** contestuale al caricamento documenti autisti | Form autisti + `documenti.data_scadenza` |
| D3 | Mezzi: **tipo veicolo** a tendina chiusa **Trattore / Semirimorchio** (non testo libero); un record = un veicolo (targa trattore **oppure** targa rimorchio, non entrambi nello stesso form) | Form mezzi |
| D4 | Associazione **autista ↔ mezzo facoltativa** | Validazione / `btn_prossimo` mezzi |
| D5 | Flusso dedicato **Allegato F** con rinnovo **annuale** + salvataggio storico | Nuovo form / step; fuori dal “quick fix” |
| D6 | Se indicate cat. **1 / 4 / 5** → documenti autorizzazione (ANGA / Rentri / pagamenti) **obbligatori** + scadenza | Validazione step documenti / per mezzo |
| D7 | **Unificare** tipi documento duplicati ANGA (es. 12/24/25) e Rentri (es. 14/26/27); allegati **distinti per categoria** sul mezzo | Seed `tipi_documento` + logica slot |
| D8 | Spostare **categorie rifiuti, ANGA, scadenze relative, carta circolazione** da autista → **mezzo** | Form + validate + grid |
| D9 | Documenti “verdi” / dichiarazioni: **compilazione annuale** (non solo firma one-shot onboarding) | Flusso post-onboarding |
| D10 | Rimuovere scadenza **carta circolazione** (e campi assicurativi) dall’anagrafica **autisti** | Form autisti |
| D11 | DB test **vuoto** (niente subvettori SGA precaricati) per prove cliente | Ops / SQL |
| D12 | Testi email onboarding: **da fornire da Pigliacelli** (oggetto + corpo) | Config mail |
| D13 | PDF finali Modello 231 / codice etico / manuale / privacy: consegna cliente **ott–nov** | Config EasyGN / placeholder |

### Anagrafica subvettore — campi da aggiungere (per dichiarazioni / allegati)

Dati oggi mancanti o incompleti in step 1, richiesti in call:

- Residenza legale rappresentante (città, indirizzo, civico)
- Codice fiscale legale rappresentante
- Provincia albo conto terzi (numero già presente)
- Banca, IBAN, codice destinatario SDI
- Capitale sociale / responsabili commerciali-amministrativi: **da valutare** (Flavia propensa a lasciare fuori o in bianco se non essenziali)

### Dichiarazioni — chiarimento

| Documento | Comportamento |
|-----------|---------------|
| Informativa privacy, codice etico, Modello 231, manuale | Firma / presa visione in onboarding; PDF definitivi in arrivo |
| **Dichiarazioni / Allegato F** (questionario) | Compilazione form + PDF; **rinnovo annuale**; non gonfiare solo lo step 1 anagrafica |
| Fatturato ultimi 3 anni | Rolling annuale (es. 2026: 23–25 → 2027: 24–26); storico in DB |

---

## Action items

### Digiweb (Davide / Erik)

| Priorità | Attività | Note |
|----------|----------|------|
| **P0 · venerdì** | Scadenze obbligatorie su upload documenti autisti | Stesso form del file |
| **P0 · venerdì** | Tipo veicolo select Trattore/Semirimorchio | Label targa coerente col tipo |
| **P0 · venerdì** | Autista su mezzo **non obbligatorio** | `onValidate` / `btn_prossimo` |
| **P0 · venerdì** | Togliere da autisti: carta circolazione, assicurazioni, categorie 1/4/5 | Spostare su mezzi |
| **P0 · venerdì** | Fix UI: pulsante chiusura ridondante / cache | Modal insert series |
| **P0 · venerdì** | Scheda admin subvettore: mostrare autisti + mezzi (non solo tratte) | |
| **P0** | Pulizia DB test (subvettori prova) | |
| **P1** | Ampliare anagrafica (residenza LR, CF, albo provincia, banca/IBAN/SDI) | |
| **P1** | Dedup tipi ANGA/Rentri; obbligo doc per cat. 1/4/5 **per mezzo** | |
| **P2** | Flusso annuale Allegato F + storico | Scope da stimare; avvisare Filippo/Francesca |
| **P2** | Presa visione con log data/ora | In corso |
| **Backlog** | Sostituzione PDF verdi quando arrivano i finali | Ott–nov |

### Pigliacelli (Flavia)

| Attività |
|----------|
| Test flusso onboarding e feedback |
| Fornire testi email credenziali / onboarding |
| Consegnare PDF finali 231 / etico / manuale / privacy (ott–nov) |

---

## Delta rispetto a luglio 2026

| Tema | Luglio | Settembre (nuovo) |
|------|--------|-------------------|
| Autista ↔ mezzo | Associazione prevista | **Facoltativa** |
| Categorie 1/4/5 | Su autista | **Su mezzo** + doc obbligatori |
| ANGA / Rentri | Tipi multipli / quietanze | **Dedup** + allegati per categoria sul mezzo |
| Carta circolazione | Anche su autista (bug/demo) | **Solo mezzo** |
| Dichiarazioni | PDF + firma onboarding | + **form annuale Allegato F** + storico |
| Tipo veicolo | Testo libero | **Enum** Trattore / Semirimorchio |
| Scadenze doc autisti | Parziale / post-upload | **Obbligatorie al caricamento** |

---

## Note operative demo

- Credenziali inviate solo su azione operatore (non automatiche all’import SGA).
- Wizard riprendibile: step salvati, riparte da dove interrotto.
- Firma documenti verdi via OTP EasyGN; dopo “Invia per attivazione” notifica operatori.
- Aggiornamenti normativi futuri: swap PDF se layout firme invariato; se cambiano posizioni firme → intervento sviluppo.
