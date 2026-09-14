import pymupdf
from pathlib import Path

doc = pymupdf.open(r"C:\Users\dvdch\Downloads\dichiarazioni.pdf")
# Dump words with positions for pages that need fill (0,1,2 = C,D,E)
for pi in (0, 1, 2, 7, 8, 9):
    page = doc[pi]
    print(f"\n===== PAGE {pi+1} words (y,x) =====")
    words = page.get_text("words")
    # print first 60 words
    for w in words[:50]:
        x0, y0, x1, y1, text, *_ = w
        print(f"{y0:6.1f},{x0:6.1f}  {text}")
