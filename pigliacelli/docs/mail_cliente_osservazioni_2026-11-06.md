# Mail cliente — osservazioni prove (06/11/2026)

Osservazioni dopo le prove su portale/contratti e appendici. Oggi di riferimento: 06/11/2026.  
Argomento “template contratto modificabile in autonomia” rimandato a **martedì prossimo**.

---

## Testo

Buongiorno,

di seguito alcune osservazioni in merito alle prove fatte:

- A Marcello non devono arrivare le notifiche ed e-mail delle varie scadenze dei documenti, bensì soltanto quelle relative alle firme del contratto e successive appendici;
- La possibilità di firma delle appendici dev’essere data a Marcello e a Flavia;
- Abbiamo notato che l’appendice fatta per il vettore Prova04novembre riporta un numero di contratto diverso da quello del contratto stesso (l’appendice faceva riferimento al contratto n. 2, mentre l’unico contratto emesso è il numero 1);
- Sia il contratto che le appendici devono essere inviati una sola volta da Pigliacelli al vettore e viceversa, nel senso che quando il vettore riceve il contratto o le successive appendici deve accettarle e firmarle. Occorre quindi eliminare il doppio invio sia del contratto che delle appendici;
- La denominazione delle appendici non può essere “Contratto#2”, bensì “Appendice#1, Appendice#2” e così via.

Infine, solo un cenno ad un argomento che tratteremo martedì prossimo: qualora non fosse già previsto, abbiamo la necessità che il contratto, essendo soggetto a continue modifiche normative anche in tempi molto stretti, possa essere da noi integrato, modificato e/o caricato ex novo in autonomia.

Vi ringraziamo per la consueta disponibilità.

Saluti.

---

## Punti / note tecniche (06/11/2026)

Elenco actionable da usare per priorità e risposta. Cross-ref: flusso firma tipo 1 vs 2/3, EasyGN, magic link review.

### 1. Marcello: solo mail/notifiche firma (contratto + appendici), non scadenze documenti

- **Marcello = `sec_users` / gruppi ScriptCase con `group_id = 5`** (committente / firma PGL).
- **Requisito:** escludere `group_id = 5` dalle notifiche scadenze documenti; lasciarlo sulle notifiche di **firma contratto/appendici**.
- Fatto in `send_expired_doc_alert` e `send_doc_expiry_alerts`: destinatari ops solo `group_id IN (1, 3)`.

### 2. Firma appendici: Marcello e Flavia

- **Appendici = `contratti.tipo_contratto_id` 2 e 3**, PDF/report **`variazione_contratto`** (tipo 1 = quadro = `nuovo_contratto_vettore`).
- Firma **committente** (lato PGL) deve essere disponibile a **Marcello (`group_id = 5`) e Flavia** (menu/griglia “da firmare”).
- Allineare ACL / voci menu / grid contratti da firmare.

### 3. Numerazione appendice Prova04novembre — bug riferimento contratto

- Caso: vettore **Prova04novembre**; appendice citava **contratto n. 2** ma l’unico contratto emesso è il **n. 1**.
- Verificare come PDF/report (`variazione_contratto` / allegato) costruisce il “numero contratto” vs `contratti.id` / progressivo / `tratte.version` / APPENDICE N°.
- Fatto: PDF/mail usano quadro tipo 1 + Appendice #N da count tipo 2/3 (non più id variazione / `tratte.version`).

### 4. Un solo invio Pigliacelli ↔ vettore (niente doppio invio)

- Contratto (tipo 1) e appendici (tipo 2/3): **un** invio al vettore; il vettore **accetta e firma** (magic link → review → firma), senza secondo giro di “invio” ridondante (mail duplicate, resend automatico, doppio EasyGN / doppia tab già vista in test).
- “Viceversa” = anche il percorso di ritorno (firma / notifica ops / firma committente) non deve generare doppioni di mail o link.
- Coerente con i fix recent: una sola apertura EasyGN; tipo 2/3 Firma diretta senza blank “dati registrati” come secondo passo inutile.

### 5. Denominazione appendici: Appendice#1, Appendice#2, …

- Vale per i documenti generati da **`variazione_contratto`** (tipo 2/3), non per il quadro tipo 1.
- **N** = count dei contratti tipo 2/3 del subvettore con `id <=` corrente (non `tratte.version`).
- **Q** = id del contratto tipo 1 dello stesso subvettore.
- Mail / subject: `Appendice #N al contratto #Q` (`send_magic_link`, reinvio committente, webhook, easygn_auto).
- PDF: `APPENDICE N° N` + `Contratto di trasporto n° Q/YYYY`; file `appendice_N_contratto_Q_…`.

### 6. (Martedì) Template contratto editabile / caricabile da PGL

- Fuori scope immediato: Pigliacelli deve poter **integrare, modificare e/o caricare ex novo** il testo del contratto in autonomia (normative che cambiano in tempi stretti).
- Da trattare in call martedì; verificare se già previsto `sec_settings` / template admin / upload PDF template.

---

## Checklist risposta / lavoro

| # | Tema | Priorità |
|---|------|----------|
| 1 | `group_id=5` (Marcello) fuori scadenze documenti; sì su firme | Fatto (job expiry) |
| 2 | Firma appendici (tipo 2/3, `variazione_contratto`): Marcello (`group_id=5`) + Flavia | Alta |
| 3 | Fix numero contratto su appendice (Prova04novembre) | Alta (bug) |
| 4 | Eliminare doppio invio contratto/appendici | Alta |
| 5 | Label Appendice#N non Contratto#N | Alta |
| 6 | Template contratto self-service PGL | Call martedì |

---

## Vedi anche

- Call 30/10: `pigliacelli_briefing_sal_2026-10-30.md`
- Mail Flavia 29/10: `mail_flavia_prova_2026-10-29.md`
- Tipi contratto / appendici: `LLM_WIKI.md` (Contratti SGA tipo 1/2/3)
- Firma / EasyGN: `easygn_codici_errore.md`
