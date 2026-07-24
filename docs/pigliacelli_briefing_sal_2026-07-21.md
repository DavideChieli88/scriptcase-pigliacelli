# Briefing e SAL — 21 luglio 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL*  
**Partecipanti:** Davide Chieli, Erik Capoccetta  
**File originali:** [`pigliacelli_briefing_sal_2026-07-21.docx`](pigliacelli_briefing_sal_2026-07-21.docx) · [`pigliacelli_briefing_sal_2026-07-21.txt`](pigliacelli_briefing_sal_2026-07-21.txt) (estratto testo)

Vedi anche: [`requisiti_pigliacelli_validazione_2026-07.md`](requisiti_pigliacelli_validazione_2026-07.md) · [`docs_elenco_documenti_subvettori.md`](../docs_elenco_documenti_subvettori.md) · [`modello_flag_documenti.md`](modello_flag_documenti.md)

---

## Riepilogo call

- **Semplificazione ambito:** eliminata configurazione dinamica posizionamento firme da parte del cliente.
- **Documenti:** distinzione tra **upload obbligatorio** e **sola presa visione** (timestamp + conferma utente).
- **Due sottoaree UI** sotto “Documenti”: vettore carica vs Pigliacelli carica e vettore prende visione.
- **DB:** flag su anagrafica tipi documento; tabelle separate **autisti** / **mezzi** + tabella associativa.
- **Upload inline** patenti/idoneità/carte circolazione durante inserimento autista/mezzo.
- **Quietanza** come tipo documento separato collegato al documento principale (polizza, ANGA, ecc.).
- **Contratto quadro** solo dopo prima tratta assegnata in SGA; appendice se subvettore già con tratte.
- **Onboarding email:** job scaglionato (~20 mail / 5 min) per ~107 vettori.
- **Flag “qualifica completata”** + approvazione/rifiuto Pigliacelli prima di operatività piena.

---

## Requisiti emersi (action items)

| # | Attività | Priorità |
|---|----------|----------|
| 1 | Sottoarea **documenti da caricare** vs **documenti da visionare** | Alta |
| 2 | Flag su `tipi_documento`: obbligatorietà, precarico FASE 1, modalità (upload / presa visione) | Alta |
| 3 | Registrazione **presa visione** (data/ora, utente) su conferma + apertura anteprima | Alta |
| 4 | Flag **“in possesso di…”** → obbligo upload documento collegato (es. quietanza) | Alta |
| 5 | Tipi **quietanza** per polizza vettoriale, ANGA, ecc. (documento figlio) | Alta |
| 6 | Rifattorizzare onboarding: documenti obbligatori precaricati in FASE 1 | Alta |
| 7 | Tabelle `subvettori_mezzi` + associazione autista↔mezzo | Media |
| 8 | Upload documenti **inline** su form autista/mezzo | Media |
| 9 | Moduli web per **dichiarazioni** (campi C–H) → poi PDF | Media |
| 10 | Report PDF dichiarazioni + informativa privacy | Media |
| 11 | Job email onboarding scaglionato (20/5 min) + marca record inviati | Media |
| 12 | Flag **qualifica completata** + filtro tratte / approvazione operatore | Media |
| 13 | Log scarti job tratte (dati mancanti, SGA duplicato, vettore assente) | Media |
| 14 | Job separati: aggiornamenti ogni 5 min vs anagrafica dedicata | Bassa |
| 15 | Chiarire con cliente chi compila sezione RSI (responsabilità sociale impresa) | Da chiedere |
| 16 | Allineare **DURC** vs **DURF** (email cliente vs call) | Da chiedere |

---

## Dettaglio per area

### Documenti — upload vs presa visione

- **Upload (vettore):** area dove il sub carica file (Flusso Iniziale, quietanze, patenti…).
- **Presa visione (Pigliacelli → vettore):** operatore carica template (manuale vettore, istruzioni magazzino…); vettore **non** carica, ma conferma visione.
- UX concordata: pulsante “Ho preso visione” → conferma popup → apertura anteprima → **timestamp** + login.
- Non serve firma digitale EasyGN per questi: solo audit trail presa visione.
- Privacy / dichiarazioni: **modulo compilazione** in piattaforma + generazione PDF (firma configurata da sviluppatori, elenco finito).

### Flag su anagrafica tipi documento (decisione call)

Su `tipi_documento` (espansione già in corso):

| Concetto | Descrizione |
|----------|-------------|
| `mandatory` | Obbligatorio di default |
| `precarica` | Slot automatico al primo login / FASE 1 |
| Modalità | Solo upload / solo presa visione / entrambi (da definire enum) |
| Possesso | Tipo abilita domanda “Sei in possesso di…?” |
| Collegamento | FK a altro tipo (es. polizza → quietanza polizza) |

> “È solo un flag che li distingue” — stessa tabella `documenti`, UI e regole diverse.

### Quietanza e “in possesso”

- Quietanza = **tipo documento separato**, collegato al tipo principale (non stesso file).
- Esempi: polizza vettoriale + quietanza; autorizzazioni ANGA + quietanza ANGA.
- Se utente flagga **in possesso** → deve caricare il documento (o la quietanza associata).
- Storicizzazione scelta “in possesso” consultabile in scheda subvettore (già da email cliente).

### Autisti e mezzi

- **Disaccoppiare** autisti e mezzi in tabelle distinte.
- Tabella associativa: `subvettore_id` + `autista_id` + `mezzo_id`.
- Durante inserimento autista/mezzo: upload inline (patente, idoneità, permesso soggiorno se flaggato, carta circolazione).
- Regola discussa: “un mezzo collegato automaticamente a un autista” — da confermare regola business.

### Contratto e tratte

- Contratto Quadro + All. A + B **solo dopo** prima tratta assegnata al vettore in SGA.
- Tratta **senza vettore** → scarto / non ammessa.
- Sub **senza altre tratte** in DB → contratto quadro; altrimenti → appendice.
- Allineato alle email di validazione luglio 2026.

### Onboarding e email

- Credenziali: discussione su invio non più da pulsante operatore se già inviate da job.
- Job batch: max **20 email ogni 5 minuti**, flag “inviato” su record.
- Cambio email vettore → invalidare credenziali precedenti + nuove credenziali.
- Fix link notifiche che reindirizzano al login (sessione / URL).

### Qualifica vettore

- Flag **qualifica completata**.
- Filtro: tratte/contratti solo per vettori qualificati.
- Pigliacelli può **accettare** o **rifiutare** qualifica → blocca operatività fino a decisione.

---

## Suggerimenti tecnici (dalla call)

1. **Non bloccare** su documenti firma non ancora forniti dal cliente: placeholder + configurazione firma quando arrivano i file.
2. **Moduli dedicati** per dichiarazioni complesse (meglio di PDF analogico).
3. **Separare job** pesanti (anagrafica) da job frequenti (5 min) per non sovraccaricare.
4. **Log scarti** esplicito sul job tratte (importo, località, vettore mancante, duplicati SGA).
5. Manuale vettore / codice etico: **caricamento operatore**; privacy/dichiarazioni: **report PDF** da dati form.

---

## Divergenze / da allineare

| Tema | Briefing 21/07 | Email cliente 07/2026 |
|------|----------------|------------------------|
| Firma dichiarazioni | Presa visione per manuali; firma solo su subset (privacy, contratto) | Firma digitale onboarding su più doc |
| DURC / DURF | Erik: “revisionare email DURF” | Cliente: DURF in Flusso Iniziale; elenco doc: DURC |
| Credenziali | Non più da pulsante se già inviate | Operatore invia quando decide |
| Upload patenti | Inline su autista/mezzo in onboarding | FASE 3 post-contratto (email) — **briefing più recente** privilegia inline |

---

*Ultimo aggiornamento: 21 luglio 2026*
