# Setup — Template contratto HTML (N1 step 1)

Obiettivo: far **modificare il contratto standard tipo 1** con HTML Editor SC.  
Migration minima: [`../migration_n1_contratti_template_min.sql`](../migration_n1_contratti_template_min.sql)

## 1) DB

```sql
-- esegui migration_n1_contratti_template_min.sql
SHOW TABLES LIKE 'contratti_template';
SELECT id, nome, attivo, LEFT(html_body, 80) FROM contratti_template;
```

Flusso completo: [`n1_template_flusso.md`](n1_template_flusso.md)  
Scelta sul contratto: `migration_n1_template_scelta_contratto.sql`

## 2) Grid — `grid_contratti_template`

1. New Application → **Grid** → tabella `contratti_template`
2. Campi visibili: `id`, `nome`, `attivo`, `is_default`, `updated_at` (nascondi `html_body` in lista)
3. Link alla form (edit / insert)
4. Filtro consigliato: `attivo` 

SQL ok:

```sql
SELECT id, nome, attivo, is_default, note, created_at, updated_at
FROM contratti_template
ORDER BY is_default DESC, attivo DESC, id ASC
```

## 3) Form — `form_contratti_template`

1. New Application → **Form** → tabella `contratti_template`
2. Campi:
   - `nome` — testo, obbligatorio
   - `attivo` — checkbox / select 1|0
   - `is_default` — checkbox (pre-selezionato in “Nuovo contratto quadro”)
   - `note` — testo corto (opz.)
   - **`html_body`** — tipo **HTML Editor** (Save HTML tags ON)
3. Campo virtuale **`help_placeholders`** (non DB), sopra `html_body`:
   - New Field → Virtual → nome `help_placeholders`
   - Type: **Text Area** (o Text)
   - **Readonly = Yes**
   - Label es. `Aiuto placeholder {{ }}`
4. onValidate: `form_contratti_template_onValidate`
5. onLoad / onLoadAll: `form_contratti_template_onLoad` (assegna testo a `help_placeholders`; **niente echo**)
6. onAfterInsert + onAfterUpdate: `form_contratti_template_onAfterUpdate` (un solo default)
7. Security: stessi gruppi operatori dei contratti

## 3b) Control nuovo contratto — campo template

Su `control_nuovo_contratto_quadro` aggiungi campo **`template_id`** (Select):

```sql
SELECT id, nome
FROM contratti_template
WHERE attivo = 1
ORDER BY is_default DESC, nome ASC
```

Aggiorna onValidate con il file repo (passa `templateId` al blank).  
Aggiorna blank `nuovo_contratto_quadro` (salva `template_id` + snapshot HTML).

## 4) Placeholder → campi DB (tipo 1)

Sostituzione in `nuovo_contratto_vettore` (non in questa form).

| Placeholder nel HTML | Origine |
|----------------------|---------|
| `{{contratto_numero}}` | `contratti.id` |
| `{{anno}}` | anno corrente |
| `{{data_certa}}` | data generazione PDF (`d/m/Y`) |
| `{{vettore_ragione_sociale}}` | `subvettori.ragione_sociale` (via `getSubvectorData`) |
| `{{vettore_citta}}` | `subvettori.sede_citta` |
| `{{vettore_provincia}}` | `subvettori.sede_provincia` |
| `{{vettore_indirizzo}}` | `subvettori.indirizzo` |
| `{{vettore_civico}}` | `subvettori.civico` |
| `{{vettore_cf}}` / `{{vettore_piva}}` | (opz.; nel Word ufficiale CF/PIVA sono nel testo fisso “Codice Fiscale, P. Iva e…”) |
| `{{vettore_reg_imprese_luogo}}` | `subvettori` luogo reg. imprese |
| `{{vettore_reg_imprese_n}}` | numero reg. imprese |
| `{{vettore_rea}}` | `subvettori.rea` |
| `{{vettore_albo}}` | `subvettori_contratti.num_iscrizione_albo` → fallback `subvettori` |
| `{{rapp_nome}}` | idem COALESCE su rappresentante |
| `{{rapp_cognome}}` | |
| `{{rapp_luogo_nascita}}` | |
| `{{rapp_prov_nascita}}` | |
| `{{rapp_data_nascita}}` | (formattata `d/m/Y`) |

**Nota SC:** nel codice PHP non scrivere letterali `{{nome}}` — ScriptCase li tratta come macro `{campo}`. Le chiavi si costruiscono a runtime (`chr(123)`…).

## 5) Cosa NON fa ancora questo step

- Edit HTML **per singolo invio** sullo snapshot
- Collegamento a `blank_posiziona_firme_pdf` / EasyGN

## Menu

Voce ops: **Template contratti** → `grid_contratti_template`.

## Log SC e HTML lungo

Salvando `html_body` completo, ScriptCase Log può fallire con
`Data too long for column 'description'` su `sc_log`.

**Soluzione: non loggare questa form**
1. Form → Settings → **Log** → disattiva Insert/Update (o tutto)
2. onScriptInit: `form_contratti_template_onScriptInit` (`log` off)
