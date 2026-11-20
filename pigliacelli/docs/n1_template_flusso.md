# N1 — Template contratto tipo 1 (flusso)

## Cosa vuole il prodotto

1. **Template master** editabili in qualsiasi momento (`form_contratti_template`)
2. **Più di un template** (tabella `contratti_template`)
3. **Scelta del template** alla creazione del contratto quadro tipo 1
4. Sul contratto resta una **copia** (`html_body_snapshot`) così ritocchi pre-invio non sporcano il master
5. Poi: PDF da snapshot → `blank_posiziona_firme_pdf` → EasyGN

## Migration

| File | Cosa |
|------|------|
| `migration_n1_contratti_template_min.sql` | Tabella + seed corto |
| `migration_n1_template_scelta_contratto.sql` | `is_default` + `contratti.template_id` + `html_body_snapshot` |
| `migration_n1_template_full_html.sql` | Stesso **testo** Word, HTML pulito (no MSO) → densità PDF ~13 pag |
| `contratto_quadro_standard_template.html` | Stesso HTML (per paste in form / rebuild) |
| `tools/build_contratto_template_html.py` | Rigenera HTML+SQL dal file Word |

`sign_boxes_json` resta a parte (editor firme).

## App

| App | Ruolo |
|-----|--------|
| `grid_contratti_template` / `form_contratti_template` | CRUD master (HTML Editor) |
| `control_nuovo_contratto_quadro` | Select **subvettore** + select **template** |
| `nuovo_contratto_quadro` | Crea contratto + salva `template_id` + copia HTML in snapshot |
| `nuovo_contratto_vettore` | PDF: `html_body_snapshot` → template master → file Word → plain; placeholder `{{...}}` |

## Lookup template (campo Control)

```sql
SELECT id, nome
FROM contratti_template
WHERE attivo = 1
ORDER BY is_default DESC, nome ASC
```

Default UI: riga con `is_default = 1` (seed “Contratto standard tipo 1”).

## Placeholder

Vedi `form_contratti_template_SETUP.md`. Sostituzione in generazione PDF (step successivo).
