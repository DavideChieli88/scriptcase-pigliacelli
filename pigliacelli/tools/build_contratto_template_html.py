# -*- coding: utf-8 -*-
"""Build CLEAN HTML template from Word HTML (stesso testo, densita' ~PDF 13 pag)."""
from __future__ import annotations

import html as html_lib
import re
from pathlib import Path

SRC = Path(r"c:\Users\dvdch\Downloads\Pigliacelli docs\CONTRATTO\contratto di trasporto.htm")
OUT_DIR = Path(__file__).resolve().parents[1]
HTML_OUT = OUT_DIR / "contratto_quadro_standard_template.html"
SQL_OUT = OUT_DIR / "migration_n1_template_full_html.sql"

P_STYLE = (
    "margin:0 0 3.2pt 0;text-align:justify;"
    "line-height:1.15;font-size:10pt;font-family:Arial,Helvetica,sans-serif;"
)
P_CENTER = (
    "margin:0 0 4pt 0;text-align:center;"
    "line-height:1.15;font-size:10pt;font-family:Arial,Helvetica,sans-serif;"
)
P_TITLE = (
    "margin:0 0 8pt 0;text-align:center;font-weight:bold;"
    "line-height:1.2;font-size:12pt;font-family:Arial,Helvetica,sans-serif;"
)


def plain_of(fragment: str) -> str:
    t = re.sub(r"<o:p[^>]*>.*?</o:p>", "", fragment, flags=re.I | re.S)
    t = re.sub(r"<[^>]+>", "", t)
    t = (
        t.replace("\xa0", " ")
        .replace("\r", " ")
        .replace("\n", " ")
        .replace("&nbsp;", " ")
    )
    t = html_lib.unescape(t)
    t = re.sub(r"[ \t]+", " ", t).strip()
    return t


def apply_placeholders(text: str) -> str:
    text, _ = re.subn(
        r"N\.\s*__\s*/\s*202_",
        "N. {{contratto_numero}}/{{anno}}",
        text,
        count=1,
        flags=re.I,
    )
    text = text.replace("__________ ", "{{vettore_ragione_sociale}} ", 1)
    reps = [
        (
            "con sede a _______ (__), Via ______ n. ___,",
            "con sede a {{vettore_citta}} ({{vettore_provincia}}), Via {{vettore_indirizzo}} n. {{vettore_civico}},",
        ),
        (
            "Registro Imprese di ________ __________,",
            "Registro Imprese di {{vettore_reg_imprese_luogo}} {{vettore_reg_imprese_n}},",
        ),
        ("R.E.A. ______,", "R.E.A. {{vettore_rea}},"),
        (
            "iscritta all’Albo Nazionale degli Autotrasportatori di cose per conto terzi al n. ___________,",
            "iscritta all’Albo Nazionale degli Autotrasportatori di cose per conto terzi al n. {{vettore_albo}},",
        ),
        (
            "rappresentante sig. ________, nato a _____ (__) il __/__/____",
            "rappresentante sig. {{rapp_nome}} {{rapp_cognome}}, nato a {{rapp_luogo_nascita}} ({{rapp_prov_nascita}}) il {{rapp_data_nascita}}",
        ),
    ]
    for a, b in reps:
        text = text.replace(a, b)
    text = text.replace("__/__/202_", "{{data_certa}}")
    return text


def main() -> None:
    raw = SRC.read_bytes().decode("cp1252")
    m = re.search(r"<body[^>]*>(.*)</body>", raw, re.I | re.S)
    body = m.group(1) if m else raw

    paras = re.findall(r"<p\b[^>]*>(.*?)</p>", body, flags=re.I | re.S)
    out: list[str] = []
    started = False
    for frag in paras:
        txt = plain_of(frag)
        if not txt:
            continue
        # salta frontespizio Word (box Data/Firma) — lo fa TCPDF
        if not started:
            if "CONTRATTO DI TRASPORTO" in txt.upper():
                started = True
            else:
                continue
        txt = apply_placeholders(txt)
        esc = html_lib.escape(txt, quote=False)
        up = txt.upper()
        if up.startswith("CONTRATTO DI TRASPORTO"):
            out.append(f'<p style="{P_TITLE}">{esc}</p>')
        elif txt == "Tra" or up == "TRA":
            out.append(f'<p style="{P_CENTER}"><strong>Tra</strong></p>')
        elif re.match(r"^(Art\.|ART\.)\s*\d+", txt, flags=re.I):
            out.append(f'<p style="{P_STYLE}"><strong>{esc}</strong></p>')
        elif txt in ("Il Committente", "Il Vettore") or txt.startswith("Il Committente") and len(txt) < 20:
            out.append(f'<p style="{P_STYLE}"><strong>{esc}</strong></p>')
        else:
            # evidenzia etichette iniziali note
            for label in ("Il Committente", "Il Vettore", "Il Proprietario Merci", "Il Caricatore Delle Merci"):
                if txt.startswith(label):
                    rest = html_lib.escape(txt[len(label) :], quote=False)
                    esc = f"<strong>{html_lib.escape(label, quote=False)}</strong>{rest}"
                    break
            out.append(f'<p style="{P_STYLE}">{esc}</p>')

    html_body = "\n".join(out)
    HTML_OUT.write_text(html_body, encoding="utf-8")
    print("paras", len(out), "bytes", HTML_OUT.stat().st_size)

    esc_sql = html_body.replace("\\", "\\\\").replace("'", "''")
    sql = f"""-- ============================================================
-- N1: template standard = STESSO TESTO del Word (contratto di trasporto.htm)
-- ma HTML pulito (senza MSO) per densita' PDF ~13 pagine come prima.
-- ============================================================

UPDATE `contratti_template`
SET
  `html_body` = '{esc_sql}',
  `note` = 'Testo Word ufficiale, HTML pulito per TCPDF (N1)',
  `updated_at` = NOW()
WHERE `id` = 1;

UPDATE `contratti` c
INNER JOIN `contratti_template` t ON t.id = c.template_id
SET c.html_body_snapshot = t.html_body
WHERE c.tipo_contratto_id = 1
  AND (
    c.html_body_snapshot IS NULL
    OR CHAR_LENGTH(c.html_body_snapshot) < 20000
  );
"""
    SQL_OUT.write_text(sql, encoding="utf-8")
    print("wrote", SQL_OUT, SQL_OUT.stat().st_size)

    joined = " ".join(out)
    for ph in [
        "{{contratto_numero}}",
        "{{vettore_ragione_sociale}}",
        "{{vettore_citta}}",
        "{{vettore_albo}}",
        "{{rapp_nome}}",
        "{{data_certa}}",
        "{{vettore_reg_imprese_luogo}}",
    ]:
        print(ph, joined.count(ph))


if __name__ == "__main__":
    main()
