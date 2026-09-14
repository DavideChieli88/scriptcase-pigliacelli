import fitz
from pathlib import Path

doc = fitz.open(r"C:\Users\dvdch\Downloads\dichiarazioni.pdf")
out_dir = Path(r"c:\Users\dvdch\Desktop\Projects\pigliacelli\docs")
for i in range(min(4, len(doc))):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    out = out_dir / f"_tmp_dich_p{i+1}.png"
    pix.save(str(out))
    print(i + 1, out.name, pix.width, pix.height)

page = doc[0]
print("--- page1 spans ---")
n = 0
for b in page.get_text("dict")["blocks"]:
    if b.get("type") != 0:
        continue
    for line in b.get("lines", []):
        for s in line.get("spans", []):
            t = s["text"].strip()
            if not t:
                continue
            print(
                f"y={s['bbox'][1]:.1f} x={s['bbox'][0]:.1f} size={s['size']:.1f} "
                f"font={s['font'][:40]} | {t[:90]}"
            )
            n += 1
            if n > 40:
                break
        if n > 40:
            break
    if n > 40:
        break

print("--- page2 spans sample ---")
page = doc[1]
n = 0
for b in page.get_text("dict")["blocks"]:
    if b.get("type") != 0:
        continue
    for line in b.get("lines", []):
        for s in line.get("spans", []):
            t = s["text"].strip()
            if not t:
                continue
            print(
                f"y={s['bbox'][1]:.1f} x={s['bbox'][0]:.1f} size={s['size']:.1f} "
                f"font={s['font'][:40]} | {t[:90]}"
            )
            n += 1
            if n > 25:
                break
        if n > 25:
            break
    if n > 25:
        break
