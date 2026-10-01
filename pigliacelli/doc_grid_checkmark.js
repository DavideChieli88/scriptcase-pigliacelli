/**
 * Programming → JavaScript Methods → nome: docGridCheckmark
 *
 * Incolla SOLO questo corpo (Scriptcase lo avvolge già in
 * function docGridCheckmark() { ... }).
 * Stesso metodo su form_subvettori_autisti_wizard e form_subvettori_mezzi.
 *
 * onLoad della view (non della modale): sc_ajax_javascript('docGridCheckmark');
 *
 * La modale (_inline) non viene toccata: lì resta il campo Document.
 * Non si sovrascrive il valore del campo, solo il testo visibile del nome file.
 */

var docGridFields = [
    'idoneita_sanitaria_info',
    'formazione_sicurezza_info',
    'dpi_iii_categoria_info',
    'permesso_soggiorno_info',
    'ricevuta_anga_cat_1',
    'ricevuta_anga_cat_4',
    'ricevuta_anga_cat_5',
    'carta_circolazione',
    'rentri_iscrizione',
    'ricevuta_rentri',
    'idoneita_sanitaria',
    'formazione_sicurezza',
    'dpi_iii_categoria',
    'permesso_soggiorno',
    'patente_info',
    'anga_cat_1',
    'anga_cat_4',
    'anga_cat_5',
    'patente',
    'cqc_info',
    'cqc'
];

function docGridIconHtml() {
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#1b7f3a;color:#fff;font-size:14px;font-weight:700;line-height:1;" aria-hidden="true">✓</span>';
}

function docGridFileToken(text) {
    var m = String(text || '').match(/[^\s\\/]+\.[A-Za-z0-9]{2,5}/);
    return m ? m[0] : '';
}

function docGridHasVisibleEditor(el) {
    var nodes = el.querySelectorAll('input, textarea, select');
    var i, n, type;
    for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        type = (n.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden') {
            continue;
        }
        if (n.offsetParent === null) {
            continue;
        }
        return true;
    }
    return false;
}

function docGridMarkLink(a, fileName) {
    if (!a || a.getAttribute('data-doc-check') === '1' || a.querySelector('span[aria-hidden="true"]')) {
        return;
    }
    var href = a.getAttribute('href') || '';
    if (!href || href === '#') {
        if (fileName) {
            a.setAttribute('href', '../_lib/file/doc/' + encodeURIComponent(fileName));
        }
    }
    href = a.getAttribute('href') || '';
    if (href && href.indexOf('javascript:') !== 0) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
    }
    a.setAttribute('title', 'Apri documento');
    a.setAttribute('data-doc-name', fileName || '');
    a.innerHTML = docGridIconHtml();
    a.setAttribute('data-doc-check', '1');
}

function docGridMarkBox(el) {
    var token, link, a;
    if (!el || el.getAttribute('data-doc-check') === '1') {
        return;
    }
    if (el.tagName === 'TH' || el.tagName === 'LABEL') {
        return;
    }
    if ((el.id || '').indexOf('id_read_off_') === 0) {
        return;
    }
    if (docGridHasVisibleEditor(el)) {
        return;
    }
    if (el.querySelector('[data-doc-check="1"]')) {
        el.setAttribute('data-doc-check', '1');
        return;
    }

    token = docGridFileToken(el.textContent || '');
    if (!token) {
        return;
    }
    if ((el.textContent || '').trim().length > 120) {
        return;
    }
    if (el.querySelector('[id^="id_read_on_"]')) {
        return;
    }

    link = el.querySelector('a');
    if (link && !docGridFileToken(link.textContent || '')) {
        link = null;
    }
    if (!link && el.tagName === 'A') {
        link = el;
    }

    if (link) {
        docGridMarkLink(link, docGridFileToken(link.textContent || '') || token);
        if (el !== link) {
            el.setAttribute('data-doc-check', '1');
        }
        return;
    }

    if (el.querySelector('input, textarea, select, button')) {
        return;
    }

    a = document.createElement('a');
    a.setAttribute('href', '../_lib/file/doc/' + encodeURIComponent(token));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.setAttribute('title', 'Apri documento');
    a.setAttribute('data-doc-name', token);
    a.innerHTML = docGridIconHtml();
    a.setAttribute('data-doc-check', '1');
    el.textContent = '';
    el.appendChild(a);
    el.setAttribute('data-doc-check', '1');
}

function docGridCheckTick() {
    var sel, nodes, links, i, f;

    if (location.href.indexOf('_inline') !== -1) {
        return;
    }
    if (window.__docGridBusy) {
        return;
    }
    window.__docGridBusy = true;

    try {
        sel = [];
        for (i = 0; i < docGridFields.length; i++) {
            f = docGridFields[i];
            sel.push('[id^="id_read_on_' + f + '_"]');
            sel.push('[id^="id_sc_field_' + f + '"]');
            sel.push('[id^="id_ajax_doc_' + f + '"]');
            sel.push('[id^="id_img_' + f + '"]');
            sel.push('[id*="_' + f + '_"]');
            sel.push('[class*="css_' + f + '_line"]');
            sel.push('[class*="css_' + f + '_grid_line"]');
            sel.push('[class*="css_' + f + '__line"]');
        }
        nodes = document.querySelectorAll(sel.join(','));
        for (i = 0; i < nodes.length; i++) {
            docGridMarkBox(nodes[i]);
        }

        links = document.querySelectorAll('a[href*="nm_mostra"], a[href*="mostra_doc"], a[href*="_lib/file/doc"], a[onclick*="nm_mostra"], a[onclick*="mostra_doc"]');
        for (i = 0; i < links.length; i++) {
            if (docGridFileToken(links[i].textContent || '')) {
                docGridMarkLink(links[i], docGridFileToken(links[i].textContent || ''));
            }
        }
    } finally {
        window.__docGridBusy = false;
    }
}

docGridCheckTick();

if (!window.__docGridObs && document.body) {
    window.__docGridObs = new MutationObserver(function () {
        docGridCheckTick();
    });
    window.__docGridObs.observe(document.body, { childList: true, subtree: true });
}

if (!window.__docGridTries) {
    window.__docGridTries = 0;
    window.__docGridTimer = setInterval(function () {
        window.__docGridTries += 1;
        docGridCheckTick();
        if (window.__docGridTries >= 30) {
            clearInterval(window.__docGridTimer);
        }
    }, 400);
}
