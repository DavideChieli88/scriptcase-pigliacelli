# Chiarimento ANGA / RENTRI / categorie — email 17 settembre 2026

**Da:** Pigliacelli (chiarimento post-SAL)  
**Data:** 17 settembre 2026  
**Contesto:** allineamento requisiti documenti rifiuti dopo call 16/09/2026  

Vedi anche: [`pigliacelli_briefing_sal_2026-09-16.md`](pigliacelli_briefing_sal_2026-09-16.md) · [`docs_elenco_documenti_subvettori.md`](docs_elenco_documenti_subvettori.md)

---

## Testo mail (fonte)

> Buongiorno,  
> provo a chiarire un po' quanto richiesto:  
> - autorizzazione ANGA e Categoria sono la medesima cosa (si può dire ad es. autorizzazione ANGA in Cat. 1 o "volgarmente" soltanto Cat. 1);  
> - se il vettore dichiara di averne anche soltanto una, tra le cat. 1 -4 -5, deve caricarla sul portale e indicare la relativa scadenza (ovviamente se ne ha 2 ne deve caricare 2 e indicare le scadenze, e così via);  
> - la ricevuta del pagamento ANGA dovrebbe essere unica per tutte le categorie (solitamente si fa un unico pagamento anche se si hanno 3 categorie) e la scadenza è sempre il 30 aprile. Ciò non toglie che il vettore possa effettuare il pagamento per ad es. 2 categorie entro il 30 aprile, ma in 2 giorni diversi. Quindi per ogni categoria io metterei la possibilità di caricare la relativa ricevuta di pagamento;  
> - l'iscrizione RENTRI è unica e non ha scadenza (a prescindere dal numero delle categorie);  
> - la ricevuta pagamento RENTRI è una sola (a prescindere dal numero delle categorie. Il Rentri è collegato alle unità locali dell'azienda e non alle categorie possedute) e la scadenza (come per la ricevuta ANGA) è il 30 aprile.  
>  
> Spero di essere riuscito a chiarire un po' il tutto, comunque resto a disposizione per qualsiasi cosa.  
> Saluti.

---

## Requisiti allineati (normativi / UX)

### Terminologia

| Termine UI | Significato |
|------------|-------------|
| Cat. 1 / 4 / 5 | = **Autorizzazione ANGA** in quella categoria (stessa cosa) |
| Flag sul mezzo `has_cat_trasp_rifiuti_X = 1` | Il vettore dichiara di possedere quella autorizzazione ANGA |

### Matrice documenti

Contesto: **per mezzo** (SAL 16/09). Se almeno una cat. 1/4/5 è flaggata su quel mezzo:

| Documento | Cardinalità | Scadenza | Obbligatorio se |
|-----------|-------------|----------|-----------------|
| **Autorizzazione ANGA Cat. X** | **1 per ogni cat. flaggata** | Sì (data indicata dal vettore) | `has_cat_X = 1` |
| **Ricevuta pagamento ANGA Cat. X** | **1 slot per cat. flaggata** (di solito un solo pagamento; ma possono pagare in giorni diversi → possibilità per categoria) | Sempre **30 aprile** (annuale) | Consigliato/previsto per ogni cat. flaggata (vedi nota) |
| **Iscrizione RENTRI** | **Una sola** (indipendente dal n° categorie) | **Nessuna** | Almeno una cat. 1/4/5 flaggata |
| **Ricevuta pagamento RENTRI** | **Una sola** (legata a unità locali azienda, non alle cat.) | **30 aprile** (annuale) | Almeno una cat. 1/4/5 flaggata |

### Esempi

| Flag sul mezzo | Upload richiesti |
|----------------|------------------|
| Solo Cat. 1 | ANGA Cat.1 + scad.; ricevuta ANGA Cat.1 (scad. 30/04); iscrizione RENTRI (no scad.); ricevuta RENTRI (scad. 30/04) |
| Cat. 1 + Cat. 5 | ANGA Cat.1 + ANGA Cat.5 (+ scadenze); ricevuta ANGA Cat.1 e/o Cat.5 (slot per cat.); RENTRI iscrizione ×1; ricevuta RENTRI ×1 |

### Cosa non fare più

- Quietanze duplicate come tipi separati da “ricevuta pagamento” (sono lo stesso documento).
- RENTRI “per categoria”.
- Scadenza sull’iscrizione RENTRI.
- Trattare “categoria” e “autorizzazione ANGA” come due entità diverse.

### Nota implementativa

- Flag cat. → campi su `subvettori_mezzi`.
- File → `documenti` con `subvettore_mezzo_id`.
- Tipi suggeriti: `Autorizzazione ANGA Cat.1|4|5`, `Ricevuta pagamento ANGA Cat.1|4|5`, `Iscrizione RENTRI` (unico), `Ricevuta pagamento RENTRI` (unico).
- Default scadenza UI ricevute ANGA/RENTRI: **30 aprile** (anno corrente o successivo a seconda della regola alert già in uso).
