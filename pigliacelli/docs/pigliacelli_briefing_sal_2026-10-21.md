# Briefing e SAL — 21 ottobre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e SAL* (21/10/2026, 10:30 CEST)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originale:** `Pigliacelli Workspace _ Briefing e SAL - 2026_10_21 10_30 CEST - Appunti di Gemini.docx`  
**Aggiornamento:** 22/10/2026, verifica su Sgam e in griglia Pigliacelli

Vedi anche: [`mail_flavia_prova_2026-10-19.md`](mail_flavia_prova_2026-10-19.md) · [`pigliacelli_briefing_sal_2026-10-13.md`](pigliacelli_briefing_sal_2026-10-13.md)

La call chiude le richieste di Flavia ancora aperte, la sola lettura dei documenti caricati dal subvettore, e l’ingresso della tariffa cliente nelle tratte. Il 22/10 la tariffa cliente è stata provata su un viaggio scritto su Sgam.

Negli appunti Gemini «AKA» e «H» sono la ricevuta ANGA. «AdMiner» è DBeaver. L’utente indicato in trascrizione come DGSCA è l’utente SQL del database di test `Sgam`.

---

## Riepilogo call

- PEC obbligatoria in anagrafica: già impostata. La categoria rifiuti del mezzo confluisce nel questionario.
- Ricevuta pagamento ANGA: scadenza fissa al **30 aprile** successivo.
- Documenti di autisti e mezzi (attestati, idoneità) visibili nella sezione DOCUMENTAZIONE, filtrabili per targa o nome, anche lato subvettore.
- Un documento caricato dal subvettore è in **sola lettura** per l’operatore Pigliacelli. Se l’operatore crea lui la richiesta, può compilarla.
- Al posto della spunta di salvataggio: pulsante **Invia per correzione**, con nota.
- Manuale del vettore: presa visione già in piedi. Mancano i file privacy e modello 231, e il significato dei campi «numero contratto» e «distribuita da». Li chiede Erik.
- Tariffa cliente: per ogni tratta, oltre alla tariffa subvettore, leggere il nolo da `T2ViaggiClienti.IMPORTO_TOTALE`. Gli addebiti cliente si valutano dopo. In questa fase entra solo la tariffa.
- Tariffa cliente visibile solo a Marcello Pigliacelli e agli operatori. Il subvettore vede la propria tariffa. In griglia, primo campo: tariffa cliente, poi tariffa vettore, extra vettore.
- Contratto firmato: niente matita. Le tratte dopo la firma non si modificano dall’applicazione. Una variazione nasce solo da SGA.
- Prima dell’invio, una correzione fatta in applicazione va riportata anche su SGA.
- Un dato sbagliato su SGA produce un contratto sbagliato. La correzione è a monte, sugli operatori che caricano SGA.
- Mail di firma: non notificare Marcello quando è lui a firmare. La mail va al subvettore e agli operatori.
- Anteprima contratto: tratte visibili, campi uno sotto l’altro.
- Prova manuale prima del rilascio: creare un vettore e un viaggio sul database di test, poi far passare i job.
- Consegna: flusso entro la settimana per i test via SGA, settimana successiva sui promemoria, modulo 2 entro fine mese. Modulo 1 in una call dedicata.
- Riscontro a Flavia a fine settimana, dopo le modifiche.

---

## Decisioni

| # | Decisione |
|---|-----------|
| D1 | Documenti caricati dal subvettore in sola lettura per l’amministratore |
| D2 | Pulsante Invia per correzione, con nota, al posto del salva generico |
| D3 | Tariffa cliente in tratta, solo per Pigliacelli e operatori |
| D4 | Contratto completato senza pulsante modifica |
| D5 | Dopo la firma, niente modifica tratte in applicazione. Variazione solo da SGA |
| D6 | Prima dell’invio, la modifica va allineata anche su SGA |
| D7 | Prova manuale: un vettore e un viaggio di test prima della consegna |
| D8 | Scadenza ricevuta ANGA al 30 aprile |
| D9 | Addebiti cliente fuori da questa modifica. Si inserisce solo la tariffa |

---

## Aggiornamento 22 ottobre — prova su Sgam

Due script T-SQL, lanciati da DBeaver su `Sgam`. Non cancellano righe esistenti. Se una scrittura fallisce, la transazione torna indietro.

DBeaver «Esegui script» spezzava il file a ogni `;` e SQL Server rispondeva `Must declare the scalar variable "@Societa"`. Gli script sono un unico batch, senza punto e virgola.

| Script | Esito |
|---|---|
| `sgam_test_01_nuovo_subvettore.sql` | Codice **99001**, TEST PIGLIACELLI VETTORE 99001, attivo, fornitore F 99001, VIA TEST 1, BARI. Modello copiato: 6363 |
| `sgam_test_02_nuovo_viaggio.sql` | Viaggio **2026/SE/990001**, vettore 99001, tariffa G |

Riletto sul database e poi in griglia Pigliacelli:

| Campo | Valore |
|---|---|
| Tariffa subvettore | 180 |
| Extra | 25 |
| Totale | 205 |
| Tariffa cliente | 250 |
| Carico / scarico | BARI / MILANO |
| Caricatore | TEST CARICATORE PIGLIACELLI |
| Merce | TEST - MERCE TEST PIGLIACELLI |
| Proprietario | TEST PIGLIACELLI CLIENTE 99001 |

Il totale è 180 + 25. Il nolo 250 sta nel campo `tratte.tariffa_cliente` e non entra nell’hash della tratta, quindi non apre una variazione di contratto.

### Nolo contro costo vettore, sui viaggi reali

Società 1, anno 2026 (su questa copia i viaggi cliente ci sono per il 2026). Viaggio di test 990001 escluso.

Il job salva come tariffa `T2ViaggiVettori.IMPORTO_UNITARIO`. Sui viaggi reali quello è il **prezzo unitario**: mediana **7,47 €**. Il totale del viaggio vettore (`IMPORTO_TOTALE`) ha mediana **201 €**. Il nolo cliente ha mediana **470 €**. Solo 650 viaggi su 12.180 hanno il prezzo unitario uguale al totale. Il test 990001 è uno di quelli, perché lo script ha scritto 180 in entrambi i campi.

Confronto tra nolo e totale del viaggio vettore più extra, su 11.340 viaggi con totale maggiore di zero:

| Esito | Viaggi | Quota |
|---|---:|---:|
| Nolo più alto | 10.033 | 88% |
| Uguale | 1.229 | 11% |
| Nolo più basso | 78 | 1% |

Scarto mediano **42 €**. Metà dei viaggi sta tra il **6%** e il **18%** sopra il totale vettore. L’extra subvettore c’è su 82 viaggi.

Da decidere: in griglia la «tariffa vettore» oggi è il prezzo unitario. Il confronto che Erik ha descritto in call (il cliente paga più di quanto Pigliacelli paga al subvettore) è sul totale del viaggio.

Le righe 99001 e 990001 restano su Sgam.

---

## Task

### Chiusi

| Task | Dove |
|---|---|
| PEC obbligatoria | `form_subvettori_starting_wizard_onValidate` |
| Scadenza assicurazione obbligatoria sul mezzo | `form_subvettori_mezzi_onValidate` |
| Categorie rifiuti nel questionario e N. Albo Gestori se una categoria è Sì | `form_subvettori_dichiarazioni_onLoad` / `onValidate` |
| Tariffa cliente da `T2ViaggiClienti.IMPORTO_TOTALE`, fuori dall’hash | job tratte v2 e T0 v2. Prova 180 / 25 / 205 / 250 |
| Prova manuale vettore + viaggio | Sgam 99001 e 2026/SE/990001, poi griglia Pigliacelli |
| Ricevuta ANGA al 30 aprile | Step documenti. Scadenza vuota: 30 aprile dell’anno in corso se oggi è prima, altrimenti dell’anno successivo |

### Davide — ancora aperti

| # | Task | Note |
|---|---|---|
| 1 | Niente date nel passato | Documenti, autisti e mezzi accettano ancora una scadenza precedente a oggi |
| 2 | Scadenze obbligatorie | La data è richiesta solo se `tipi_documento.mandatory = 1`. Va controllata la colonna sui tipi del flusso |
| 3 | DOCUMENTAZIONE | Attestati e idoneità restano sulla sezione autisti. Vanno nell’elenco documenti, filtrabili per targa o nome, anche lato subvettore |
| 4 | Sola lettura + Invia per correzione | Fatto su `form_documenti`: in modifica Tipo documento e Subvettore sono sola lettura, in inserimento restano editabili. Il pulsante `btn_invia_correzione` sostituisce la spunta `is_not_ok` e usa lo stesso avviso |
| 5 | Tendine Tipo documento e Subvettore | In modifica non cambiano più il record. Restano i campi della richiesta nuova |
| 6 | Griglia e anteprima | Tariffa cliente per prima, visibile a operatori e Marcello, nascosta al subvettore. Poi tariffa vettore e extra. Anteprima con i campi in verticale e le tratte |
| 7 | Contratto firmato | L’anagrafica è già in sola lettura con stato maggiore di 2. Restano da togliere la modifica delle tratte dopo la firma e il salvataggio sul contratto completato |
| 8 | Mail a Marcello | Non inviargli la notifica quando è lui a firmare |
| 9 | Job alert scadenze | Revisione e prova, come da call |
| 10 | Quale importo è la tariffa vettore | Decidere se la griglia resta sul prezzo unitario o passa a `IMPORTO_TOTALE` del viaggio |

### Erik

| Task |
|---|
| Chiedere privacy, modello 231 e il significato di «numero contratto» e «distribuita da» nel manuale |
| Sollecitare Francesca e i referenti per i moduli |
| Addebiti cliente: rimandati. In questa fase c’è solo la tariffa |

### Fuori da questo giro

- Modulo 2 entro fine mese. La settimana dopo la consegna del flusso è dedicata ai promemoria.
- Modulo 1 in una call a parte.
- Le righe di test 99001 e 990001 su Sgam non vanno cancellate senza una decisione esplicita.
