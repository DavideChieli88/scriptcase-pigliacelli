# Mail Flavia — esito prova portale (19/10/2026)

Prova limitata lato vettore e lato PGL. Oggi di riferimento della prova: si poteva salvare come scadenza il 18/10/2026.

---

## Testo

Buongiorno Erik,

di seguito alcuni elementi emersi dall’ultima prova.

Lato Vettore:

- Nella compilazione dell’anagrafica la pec deve essere obbligatoria.
- Nella compilazione dell’anagrafica (sezione Mezzi) è necessario prevedere come obbligatoria la scadenza assicurazione.
- Anagrafica, sezione Mezzi: se spuntiamo la categoria del trasporto rifiuti nell’anagrafica, indicando ad esempio la cat. 1, tale informazione deve confluire in automatico anche nella pagina successiva (Questionario) e, di conseguenza, deve diventare obbligatoria anche la casella N. Albo Gestori (obbligatoria solo nel caso di trasporto rifiuti).
- Nella sezione dedicata al Flusso Documentale: per tutti deve essere impossibile inserire una data pregressa (dalla prova odierna: oggi posso inserire come scadenza il 18.10.2026).
- Inoltre, la scadenza relativa alla ricevuta del pagamento ANGA è sempre il 30 aprile. Quindi sarebbe utile prevedere in automatico come scadenza il 30 aprile successivo alla registrazione sul portale. È possibile?
- Nella sezione Flusso Documentale: verificare che le scadenze dei documenti obbligatori siano tutte obbligatorie.
- Abbiamo inserito tutte le scadenze ma alcune (ad esempio quella degli attestati di formazione e dell’idoneità sanitaria) non sono confluite automaticamente nella sez. DOCUMENTAZIONE. Risultano visibili solamente nella sezione AUTISTI.

Operando lato PGL, dal momento che la prova è limitata, segnaliamo solo che:

- Nella sezione DOCUMENTAZIONE: aprendo un qualsiasi documento possiamo visualizzarne le informazioni. In questa sezione è presente anche il menù a tendina TIPO DOCUMENTO. Da qui, se selezioniamo un altro documento dal menù dovrebbero aprirsi le informazioni di quest’ultimo. Invece, il documento caricato e la data restano relativi al primo.
- Nella medesima sezione, non capiamo la funzione del menù a tendina SUBVETTORE. Anche in questo caso, se selezioniamo un diverso vettore, i documenti e le scadenze restano quelli del primo vettore visualizzato.

---

## Cosa manca

Stato rivisto il 22/10/2026. Fatti i punti 1, 2, 3 e 5. Il resto è ancora aperto. Elenco aggiornato anche in `pigliacelli_briefing_sal_2026-10-21.md`.

### 1. PEC obbligatoria in anagrafica — fatto

`form_subvettori_starting_wizard_onValidate` rifiuta la PEC vuota e la PEC non valida come email.

### 2. Scadenza assicurazione obbligatoria sul mezzo — fatto

`form_subvettori_mezzi_onValidate` richiede `scadenza_assicurazioni` insieme a targa, carta di circolazione e relativa scadenza.

### 3. Categoria rifiuti → questionario → N. Albo Gestori — fatto

I radio restano sul mezzo. In bozza il questionario li precarica. `form_subvettori_dichiarazioni_onValidate` rende `num_albo_gestori` obbligatorio se almeno una categoria è Sì. Una dichiarazione già firmata non viene ricontrollata.

### 4. Niente scadenze nel passato

`form_documenti_wizard_onValidate` e `form_documenti_onValidate` accettano `data_scadenza` se è compilata. Non la confrontano con oggi. Stesso buco sulle date di autista e mezzo.

### 5. Ricevuta ANGA: 30 aprile automatico — fatto

Se la scadenza è vuota e il tipo è «Ricevuta pagamento ANGA» (cat. 1, 4 o 5): oggi prima del 30 aprile → 30 aprile dell’anno in corso, altrimenti 30 aprile dell’anno successivo. Una data già compilata non viene sovrascritta. Lo slot nasce con la data in `onAfterInsert` / `onAfterUpdate` del mezzo. Le righe già vuote le riempie `form_documenti_wizard_onScriptInit`; `onLoadRecord` la mostra, `onValidate` la scrive in salvataggio.

### 6. Scadenze obbligatorie sui documenti obbligatori

Nello step documenti la scadenza è richiesta solo se `tipi_documento.mandatory = 1` e `flag_possesso = 0`. Se il tipo è obbligatorio in anagrafica ma `mandatory` è 0, la data passa vuota. Va verificata la colonna `mandatory` dei tipi del flusso, non solo il messaggio a video.

### 7. Idoneità e attestati solo in AUTISTI

È il filtro attuale, non un salvataggio perso. `form_documenti_wizard` elenca solo righe con autista e mezzo vuoti. Idoneità sanitaria e attestati di formazione sono documenti dell’autista (`subvettore_autista_id` valorizzato, scadenze anche su `subvettori_autisti`). Per vederli in DOCUMENTAZIONE il filtro dello step va allargato, oppure quelle righe vanno mostrate in sola lettura dentro lo stesso elenco.

### 8 e 9. Tendine Tipo documento e Subvettore (lato PGL)

`form_documenti` apre un record. `tipo_documento_id` e `subvettore_id` sono campi di quella riga. Cambiarli non carica un altro documento: restano file e scadenza del record già aperto. Non c’è un onChange che cerchi l’altra riga e la apra. Le due tendine, su questa form, modificano il documento corrente.
