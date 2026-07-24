# Modello flag documenti — presa visione e “in possesso”

Proposta architetturale. Integra briefing 21/07/2026 e email cliente.

---

## Stato attuale su `tipi_documento` (aggiunti)

| Campo | Tipo | Significato |
|-------|------|-------------|
| `is_readonly` | TINYINT | 1 = solo presa visione (sub non carica; file da operatore); 0 = upload |
| `flag_possesso` | TINYINT | 1 = mostra “Sei in possesso di…?” |
| `tipo_collegato_id` | INT NULL FK → `tipi_documento.id` | Tipo da richiedere se `in_possesso=1` (es. quietanza) |

> **No** `tipo_padre_id`. Reverse: `WHERE tipo_collegato_id = :id`.  
> A livello istanza: `documenti.documento_padre_id` (polizza ↔ quietanza).

### Esempi

| Tipo | is_readonly | flag_possesso | tipo_collegato_id |
|------|-------------|---------------|-------------------|
| Polizza RCA | 0 | 0 | Quietanza RCA |
| Polizza vettoriale | 0 | 1 | Quietanza polizza vett. |
| Manuale vettore | 1 | 0 | — |
| Quietanza polizza vett. | 0 | 0 | — *(puntata da Polizza)* |
| Permesso soggiorno | 0 | 1 | — |

**UI due aree:**
- Documenti da caricare → `is_readonly = 0`
- Documenti da visionare → `is_readonly = 1`

---

## Principio livelli

| Livello | Cosa |
|---------|------|
| **`tipi_documento`** | Config (i 3 flag sopra) |
| **`documenti`** | Istanza: file, `in_possesso`, `presa_visione_at`, `documento_padre_id` |
| **Audit possesso** *(consigliata)* | `subvettore_dichiarazioni_documento` |

---

## Campi ancora da prevedere su `documenti` (istanza)

| Campo | Significato |
|-------|-------------|
| `in_possesso` | Risposta sì/no del sub (NULL = N/A) |
| `presa_visione_at` / `presa_visione_login` | Timestamp conferma visione |
| `documento_padre_id` | Quietanza → riga polizza |

Opzionali dopo: `mandatory` / `precarica` su tipo o override su riga (non ancora aggiunti).

### Flusso “in possesso” + quietanza

```
1. Tipo con flag_possesso=1 e tipo_collegato_id = Quietanza
2. UI: "Sei in possesso di …?" [Sì/No]
3. Se Sì → in_possesso=1 + INSERT riga tipo_collegato (documento_padre_id = riga corrente)
4. Se No → in_possesso=0, nessun upload collegato
```

### Flusso presa visione (`is_readonly=1`)

```
1. Operatore carica file sulla riga
2. Sub: anteprima + "Ho preso visione"
3. presa_visione_at = NOW(), presa_visione_login = [usr_login]
```

---

*Riferimento: [`pigliacelli_briefing_sal_2026-07-21.md`](pigliacelli_briefing_sal_2026-07-21.md)*
