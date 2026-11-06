# EasyGN — codici errore API

Risposta tipica su create/start fallito:

```json
{"errors": ["G00"]}
```

oppure (alcuni ambienti):

```json
{"type":"about:blank","detail":"Something wrong occurred."}
```

Fonte: tabella codici EasyGN (fornita 2026-11-04). Usata da `easygn_start_wf`, `easygn_start_wf_auto`, `easygn_start_wf_docs`.

| ID | CODE | DESC |
|----|------|------|
| 1 | K00 | API Key non valorizzata |
| 2 | K01 | API Key Canale non valida |
| 3 | K02 | API Key Canale non attiva |
| 4 | K03 | API Key Organizzazione non valida |
| 5 | K04 | API Key Organizzazione non attiva |
| 6 | A00 | Azione non dichiarata |
| 7 | A01 | Azione non riconosciuta |
| 8 | J00 | JSON vuoto oppure non valido |
| 9 | C00 | Tipologia Firma non valorizzata |
| 10 | C01 | Tipologia Firma non trovata per l'Organizzazione |
| 11 | C02 | Tipologia Firma non attiva per l'Organizzazione |
| 12 | C03 | Budget firme esaurito per questa Tipologia Firma |
| 13 | C04 | Canale non autorizzato per questa Tipologia Firma |
| 14 | F00 | La sezione "files" non è valorizzata |
| 15 | F01 | Il parametro "name" della sezione "files" non è valorizzato |
| 16 | F02 | Il parametro "content" della sezione "files" non è valorizzato oppure non è valido |
| 17 | F03 | Il parametro "position" della sezione "files" non è valido |
| 18 | F04 | Il parametro "attachment" della sezione "files" non è valido |
| 19 | S00 | Il parametro "signers" non è valorizzato |
| 20 | S01 | Il parametro "name" della sezione "signers" non è valorizzato |
| 21 | S02 | Il parametro "surname" della sezione "signers" non è valorizzato |
| 22 | S03 | Il parametro "email" della sezione "signers" non è valorizzato oppure non è valido |
| 23 | S04 | Il parametro "email" della sezione "signers" contiene un valore duplicato |
| 24 | S05 | Il parametro "phone" della sezione "signers" non è valorizzato oppure non è valido |
| 25 | S06 | Il parametro "phone" della sezione "signers" contiene un valore duplicato |
| 26 | S07 | Il parametro "email" della sezione "signers" non corrisponde a un certificato di Firma Elettronica Qualificata valido! |
| 27 | V00 | Il parametro "visuals" non è valorizzato |
| 28 | V01 | Il parametro "position" della sezione "visuals" non è valorizzato oppure non è valido |
| 29 | V02 | Il parametro "page" della sezione "visuals" non è valorizzato oppure non è valido |
| 30 | O00 | Il parametro "order" della sezione "signers" non è valorizzato |
| 31 | P00 | Il parametro "id" procedura non è stato valorizzato |
| 32 | P01 | Il parametro "id" corrisponde a una procedura che non esiste |
| 33 | M00 | Il parametro "id" firmatario non è stato valorizzato |
| 34 | M01 | Il parametro "id" corrisponde a un firmatario che non esiste |
| 35 | D00 | Il parametro "id" file non è stato valorizzato |
| 36 | D01 | Il parametro "id" corrisponde a un file che non esiste |
| 37 | SC1 | Il parametro "email" del certificato non è valorizzato oppure non è valido |
| 38 | SC2 | Il parametro "user" del certificato non è valorizzato oppure non è valido |
| 39 | SC3 | Il parametro "pwd" del certificato non è valorizzato oppure non è valido |
| 40 | G00 | Errore generale |

## Note operative Pigliacelli

- Prefissi utili: **K** key, **C** tipologia firma, **F** files/PDF, **S** signers, **V** visuals, **G** generico.
- In `easygn_start_wf` c’è un hint esplicito solo per **S04** (email duplicate).
- **G00** = catch-all: non indica il campo; controllare log `create payload (sanitized)`, PDF, visuals, e se serve ticket EasyGN.
- Telefono/email di test uguali su più firmatari → rischio **S04** / **S06** (in ambienti di test a volte passa comunque).
