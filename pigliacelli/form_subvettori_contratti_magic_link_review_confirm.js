/**
 * Programming → JavaScript Methods → mlReviewConfirmInit
 *
 * Incolla TUTTO questo file nel corpo del metodo.
 * onLoad chiama mlReviewConfirmInit con il JSON dell'anteprima.
 *
 * Schermata: istruzioni, Accetta e invia per la firma / Rifiuta, PDF aperto.
 * Accetta: modale nome, cognome, email, telefono (anagrafica), poi salva il form.
 * Rifiuta: chiama il metodo Programming mlReviewRefuseInit.
 */

function mlReviewFindForm() {
    var forms = document.getElementsByTagName('form');
    var i;
    for (i = 0; i < forms.length; i++) {
        if (forms[i].name && forms[i].name.indexOf('form_') === 0) {
            return forms[i];
        }
        if (forms[i].id && forms[i].id.indexOf('form_') === 0) {
            return forms[i];
        }
    }
    return forms.length ? forms[0] : null;
}

function mlReviewSetField(form, name, value) {
    if (!form) {
        return;
    }
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) {
        el = document.querySelector('[name="' + name + '"]');
    }
    if (el) {
        el.value = value;
    }
}

function mlReviewEnsureHiddenConfirm(form) {
    if (!form) {
        return;
    }
    var el = form.querySelector('input[name="review_confirm"]');
    if (!el) {
        el = document.createElement('input');
        el.type = 'hidden';
        el.name = 'review_confirm';
        form.appendChild(el);
    }
    el.value = '1';
}

function mlReviewTriggerSave() {
    window.__mlReviewSaveConfirmed = true;
    var form = mlReviewFindForm();
    mlReviewEnsureHiddenConfirm(form);
    if (form && form.closewin) {
        try {
            form.closewin.value = 'Y';
        } catch (e) {
        }
    }
    mlReviewSetField(form, 'closewin', 'Y');
    setTimeout(function () {
        if (typeof scBtnFn_sys_format_alt === 'function') {
            scBtnFn_sys_format_alt();
            return;
        }
        if (typeof window.nm_atualiza === 'function') {
            window.nm_atualiza('alterar');
            return;
        }
        var btn = document.getElementById('sc_b_upd_t') || document.getElementById('sc_b_upd_b');
        if (btn) {
            btn.click();
        }
    }, 200);
}

function mlReviewButtonsHtml() {
    return ''
        + '<button type="button" class="ml-review-accetta" style="padding:12px 18px;border:0;border-radius:8px;background:#5b2d8e;color:#fff;font-weight:bold;cursor:pointer;"><i class="fas fa-check" style="margin-right:8px;" aria-hidden="true"></i>Accetta e invia per la firma</button>'
        + '<button type="button" class="ml-review-rifiuta" style="padding:12px 18px;border:0;border-radius:8px;background:#c62828;color:#fff;font-weight:bold;cursor:pointer;"><i class="fas fa-times" style="margin-right:8px;" aria-hidden="true"></i>Rifiuta</button>';
}

function mlReviewBindButtons(root, cfg) {
    var accetta = root.querySelectorAll('.ml-review-accetta');
    var rifiuta = root.querySelectorAll('.ml-review-rifiuta');
    var i;
    for (i = 0; i < accetta.length; i++) {
        accetta[i].onclick = function () {
            mlReviewOpenAccetta(cfg);
        };
    }
    for (i = 0; i < rifiuta.length; i++) {
        rifiuta[i].onclick = function () {
            if (typeof mlReviewRefuseInit === 'function') {
                mlReviewRefuseInit();
            }
        };
    }
}

function mlReviewOpenAccetta(cfg) {
    var overlay = document.getElementById('ml-review-accetta-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        return;
    }
    overlay = document.createElement('div');
    overlay.id = 'ml-review-accetta-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;'
        + 'display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = ''
        + '<div style="max-width:480px;width:100%;background:#fff;border-radius:12px;padding:22px 24px;'
        + 'font-family:Arial,Helvetica,sans-serif;color:#2d3748;">'
        + '<h2 style="margin:0 0 8px;font-size:18px;color:#1a3a5c;">Conferma il rappresentante legale</h2>'
        + '<p style="margin:0 0 16px;font-size:14px;">Controlla i dati prima di inviare il contratto alla firma.</p>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Nome<br>'
        + '<input id="ml-rev-nome" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Cognome<br>'
        + '<input id="ml-rev-cognome" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Email<br>'
        + '<input id="ml-rev-email" type="email" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 16px;">Telefono<br>'
        + '<input id="ml-rev-tel" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<p id="ml-rev-err" style="display:none;color:#9b2c2c;font-size:13px;margin:0 0 12px;"></p>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end;">'
        + '<button type="button" id="ml-rev-back" style="padding:10px 16px;border:1px solid #cbd5e0;background:#fff;border-radius:8px;">Indietro</button>'
        + '<button type="button" id="ml-rev-go" style="padding:10px 16px;border:0;background:#5b2d8e;color:#fff;border-radius:8px;font-weight:bold;">Conferma e invia</button>'
        + '</div></div>';
    document.body.appendChild(overlay);
    document.getElementById('ml-rev-nome').value = cfg.nome || '';
    document.getElementById('ml-rev-cognome').value = cfg.cognome || '';
    document.getElementById('ml-rev-email').value = cfg.email || '';
    document.getElementById('ml-rev-tel').value = cfg.telefono || '';
    document.getElementById('ml-rev-back').onclick = function () {
        overlay.style.display = 'none';
    };
    document.getElementById('ml-rev-go').onclick = function () {
        var nome = document.getElementById('ml-rev-nome').value.replace(/^\s+|\s+$/g, '');
        var cognome = document.getElementById('ml-rev-cognome').value.replace(/^\s+|\s+$/g, '');
        var email = document.getElementById('ml-rev-email').value.replace(/^\s+|\s+$/g, '');
        var tel = document.getElementById('ml-rev-tel').value.replace(/^\s+|\s+$/g, '');
        var err = document.getElementById('ml-rev-err');
        if (nome === '' || cognome === '' || email === '' || tel === '' || email.indexOf('@') < 0) {
            err.style.display = 'block';
            err.textContent = 'Servono nome, cognome, email e telefono del rappresentante.';
            return;
        }
        var form = mlReviewFindForm();
        mlReviewSetField(form, 'nome_rappresentante', nome);
        mlReviewSetField(form, 'cognome_rappresentante', cognome);
        mlReviewSetField(form, 'email_rappresentante', email);
        mlReviewSetField(form, 'telefono_rappresentante', tel);
        overlay.style.display = 'none';
        mlReviewTriggerSave();
    };
}

function mlReviewReadCfg() {
    var raw = arguments.length ? arguments[0] : null;
    if (raw && typeof raw === 'object' && raw.pdf) {
        return raw;
    }
    if (typeof raw === 'string' && raw.charAt(0) === '{') {
        try {
            return JSON.parse(raw);
        } catch (e1) {
            raw = null;
        }
    }
    var el = document.getElementById('ml-review-cfg');
    if (!el) {
        return null;
    }
    try {
        return JSON.parse(el.textContent || el.innerText || '');
    } catch (e2) {
        return null;
    }
}

function mlReviewBuild(cfg) {
    if (window.__mlReviewPreviewInstalled || !cfg) {
        return;
    }
    window.__mlReviewPreviewInstalled = true;

    var form = mlReviewFindForm();
    if (form) {
        form.style.display = 'none';
    }

    var shell = document.getElementById('ml-review-shell');
    if (!shell) {
        shell = document.createElement('div');
        shell.id = 'ml-review-shell';
        shell.style.cssText = 'position:fixed;inset:0;z-index:99990;overflow:auto;background:#eef1f4;';
        shell.innerHTML = ''
            + '<div style="max-width:980px;margin:16px auto;padding:0 16px 32px;font-family:Arial,Helvetica,sans-serif;">'
            + '<div class="ml-review-bar" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">' + mlReviewButtonsHtml() + '</div>'
            + '<iframe class="ml-review-pdf" title="Anteprima contratto" src="' + (cfg.pdf || '') + '" '
            + 'style="width:100%;height:78vh;border:1px solid #dde1e6;background:#fff;"></iframe>'
            + '<div class="ml-review-bar" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:16px;">' + mlReviewButtonsHtml() + '</div>'
            + '</div>';
        document.body.appendChild(shell);
    }
    mlReviewBindButtons(shell, cfg);
}

function mlReviewStart() {
    mlReviewBuild(mlReviewReadCfg());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mlReviewStart);
} else {
    mlReviewStart();
}
