# Fortezza fantasy modulare — scala 28 mm

Set parametrico OpenSCAD pensato per una Bambu Lab P2S (volume utile 256 × 256 × 256 mm).

## Pezzi inclusi

- `01_wall.scad`: muro diritto 180 × 32 × 140 mm
- `02_gate_wall.scad`: muro con arco 220 × 32 × 140 mm
- `03_gate_doors.scad`: portone a due ante separato
- `04_tower.scad`: torre ottagonale, circa 119 × 119 × 210 mm
- `05_connector.scad`: chiavetta doppia per unire muro-muro o muro-torre
- `06_demo.scad`: anteprima dell'insieme, non pensata per la stampa
- `fantasy_fortress.scad`: sorgente parametrico principale

Mura e torri hanno due sedi sovrapposte su ogni punto di giunzione. La torre può ricevere mura su tutti e quattro i lati cardinali. Per ogni giunzione servono due chiavette.

## Esportare gli STL

1. Installa OpenSCAD da <https://openscad.org/downloads.html>.
2. Apri PowerShell nella cartella `3D_assets`.
3. Esegui:

   ```powershell
   .\export_stl.ps1
   ```

Gli STL vengono salvati nella sottocartella `STL`.

In alternativa, apri un preset in OpenSCAD, premi `F6`, poi scegli **File > Export > Export as STL**.

## Personalizzazione

Modifica i parametri all'inizio di `fantasy_fortress.scad`:

- `wall_length`, `wall_depth`: lunghezza e spessore del muro
- `wall_body_height`, `wall_total_height`: altezza del camminamento e altezza totale
- `gate_length`, `gate_opening_width`: dimensioni della sezione cancello
- `tower_radius`, `tower_body_height`, `tower_total_height`: dimensioni torre
- `fit_clearance`: gioco su ciascun lato delle chiavette

Il valore iniziale di `fit_clearance` è 0,25 mm per lato. Prima di stampare tutti i moduli, stampa una chiavetta e una piccola parte di prova oppure un singolo muro. Se l'incastro è troppo duro, porta il valore a 0,30–0,35 mm; se è lasco, prova 0,15–0,20 mm.

## Indicazioni di stampa

- Scala nello slicer: **100%**
- Ugello: 0,4 mm
- Layer: 0,20 mm
- Pareti: 3 o 4
- Riempimento: 10–15% gyroid
- Supporti: normalmente disattivati; per l'arco del cancello valuta supporti solo dalla piastra se il filamento crea cedimenti
- Brim: utile per torre e mura alte
- Posizione: tutti i preset sono già orientati con la base sul piatto

La torre è cava e aperta sotto per ridurre materiale e tempi. Il portone è separato: può essere incollato chiuso, montato arretrato nell'arco oppure usato come elemento scenico mobile.

## Proporzioni

In scala 28 mm, le mura da 140 mm risultano imponenti ma restano tra gli edifici da 120 e 180 mm indicati. La torre da 210 mm supera chiaramente il profilo della fortezza senza oltrepassare l'altezza utile della P2S.
