/**
 * Programming → JavaScript Methods → mlReviewRefuseInit
 *
 * È il codice del pulsante Rifiuta. Scriptcase lo esegue al click.
 * Incolla TUTTO questo file nel corpo del metodo, senza aggiungere function mlReviewRefuseInit.
 *
 * Chiede la nota e invia scId + note a blank_magic_link_review_rifiuta.
 * scId e l'URL stanno nel div #ml-review-cfg scritto da onLoad.
 */

var cfgEl = document.getElementById('ml-review-cfg');
var cfg = {};
if (cfgEl) {
    try {
        cfg = JSON.parse(cfgEl.textContent || cfgEl.innerText || '{}');
    } catch (e) {
        cfg = {};
    }
}

var overlay = document.getElementById('ml-review-rifiuta-overlay');
if (overlay) {
    overlay.style.display = 'flex';
} else {
    overlay = document.createElement('div');
    overlay.id = 'ml-review-rifiuta-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;'
        + 'display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = ''
        + '<div style="max-width:480px;width:100%;background:#fff;border-radius:12px;padding:22px 24px;'
        + 'font-family:Arial,Helvetica,sans-serif;color:#2d3748;">'
        + '<h2 style="margin:0 0 8px;font-size:18px;color:#1a3a5c;">Rifiuta il contratto</h2>'
        + '<p style="margin:0 0 12px;font-size:14px;">Il rifiuto blocca questo contratto. Indica il motivo.</p>'
        + '<textarea id="ml-rev-nota" rows="4" style="width:100%;padding:8px;box-sizing:border-box;"></textarea>'
        + '<p id="ml-rev-nota-err" style="display:none;color:#9b2c2c;font-size:13px;margin:8px 0 0;"></p>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">'
        + '<button type="button" id="ml-rev-rifiuta-back" style="padding:10px 16px;border:1px solid #cbd5e0;background:#fff;border-radius:8px;">Indietro</button>'
        + '<button type="button" id="ml-rev-rifiuta-go" style="padding:10px 16px;border:0;background:#9b2c2c;color:#fff;border-radius:8px;font-weight:bold;">Conferma rifiuto</button>'
        + '</div></div>';
    document.body.appendChild(overlay);
    document.getElementById('ml-rev-rifiuta-back').onclick = function () {
        overlay.style.display = 'none';
    };
    document.getElementById('ml-rev-rifiuta-go').onclick = function () {
        var nota = document.getElementById('ml-rev-nota').value.replace(/^\s+|\s+$/g, '');
        var err = document.getElementById('ml-rev-nota-err');
        if (nota === '') {
            err.style.display = 'block';
            err.textContent = 'La nota è obbligatoria.';
            return;
        }
        var f = document.createElement('form');
        f.method = 'POST';
        f.action = cfg.rifiutaUrl || '../blank_magic_link_review_rifiuta/';
        var a = document.createElement('input');
        a.type = 'hidden';
        a.name = 'scId';
        a.value = String(cfg.scId || '');
        var b = document.createElement('input');
        b.type = 'hidden';
        b.name = 'note';
        b.value = nota;
        f.appendChild(a);
        f.appendChild(b);
        document.body.appendChild(f);
        f.submit();
    };
}
