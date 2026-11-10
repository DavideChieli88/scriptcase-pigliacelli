/**
 * Programming → JavaScript Methods → mlReviewConfirmInit
 *
 * Incolla TUTTO questo file nel corpo del metodo.
 * onLoad chiama mlReviewConfirmInit con il JSON dell'anteprima.
 *
 * Schermata: istruzioni + PDF.
 * Tipo 1: Accetta / Rifiuta (modale rappresentante; rifiuto via mlReviewRefuseInit).
 * Tipo 2/3: solo Firma → cfg.firmaUrl (finalize mode=subvettore → EasyGN).
 * Firma/Accetta restano disabilitati finché ajax=status non conferma PDF su disco.
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

function mlReviewEnsureHidden(form, name, value) {
    if (!form) {
        return;
    }
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) {
        el = document.createElement('input');
        el.type = 'hidden';
        el.name = name;
        form.appendChild(el);
    }
    el.value = value;
}

function mlReviewEnsureHiddenConfirm(form) {
    mlReviewEnsureHidden(form, 'review_confirm', '1');
}

function mlReviewTriggerSave(opts) {
    opts = opts || {};
    // closewin=Y fa aprire lo sc_redir in un'altra finestra → EasyGN doppio con goToSign.
    var useCloseWin = opts.closewin === true;
    window.__mlReviewSaveConfirmed = true;
    var form = mlReviewFindForm();
    mlReviewEnsureHiddenConfirm(form);
    if (form && form.closewin) {
        try {
            form.closewin.value = useCloseWin ? 'Y' : 'N';
        } catch (e) {
        }
    }
    mlReviewSetField(form, 'closewin', useCloseWin ? 'Y' : 'N');
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

function mlReviewIsDirectSign(cfg) {
    if (!cfg) {
        return false;
    }
    if (cfg.directSign === 1 || cfg.directSign === true || cfg.directSign === '1') {
        return true;
    }
    var tipo = parseInt(cfg.tipoContrattoId, 10) || 0;
    return tipo === 2 || tipo === 3;
}

function mlReviewButtonsHtml(cfg) {
    var dim = 'opacity:.55;cursor:not-allowed;';
    if (mlReviewIsDirectSign(cfg)) {
        return ''
            + '<button type="button" class="ml-review-firma" disabled aria-disabled="true" style="padding:12px 18px;border:0;border-radius:8px;background:#5b2d8e;color:#fff;font-weight:bold;' + dim + '">'
            + '<i class="fas fa-pen" style="margin-right:8px;" aria-hidden="true"></i>Firma il contratto</button>';
    }
    return ''
        + '<button type="button" class="ml-review-accetta" disabled aria-disabled="true" style="padding:12px 18px;border:0;border-radius:8px;background:#5b2d8e;color:#fff;font-weight:bold;' + dim + '"><i class="fas fa-check" style="margin-right:8px;" aria-hidden="true"></i>Accetta e invia per la firma</button>'
        + '<button type="button" class="ml-review-rifiuta" style="padding:12px 18px;border:0;border-radius:8px;background:#c62828;color:#fff;font-weight:bold;cursor:pointer;"><i class="fas fa-times" style="margin-right:8px;" aria-hidden="true"></i>Rifiuta</button>';
}

function mlReviewSetActionButtonsEnabled(root, enabled) {
    if (!root) {
        return;
    }
    var nodes = root.querySelectorAll('.ml-review-firma, .ml-review-accetta');
    var i;
    for (i = 0; i < nodes.length; i++) {
        nodes[i].disabled = !enabled;
        nodes[i].setAttribute('aria-disabled', enabled ? 'false' : 'true');
        nodes[i].style.opacity = enabled ? '1' : '0.55';
        nodes[i].style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
}

function mlReviewSetPdfStatus(text, isError) {
    var el = document.getElementById('ml-review-pdf-status');
    if (!el) {
        return;
    }
    el.textContent = text || '';
    el.style.color = isError ? '#9b2c2c' : '#4a5568';
}

function mlReviewWaitPdfReady(cfg, root) {
    if (!cfg || !cfg.statusUrl) {
        mlReviewSetActionButtonsEnabled(root, true);
        mlReviewSetPdfStatus('');
        return;
    }
    if (window.__mlReviewPdfPollStarted) {
        return;
    }
    window.__mlReviewPdfPollStarted = true;

    var t0 = Date.now();
    var timeoutMs = 90000;
    var intervalMs = 1500;
    var fetchErrors = 0;

    mlReviewSetActionButtonsEnabled(root, false);
    mlReviewSetPdfStatus('Preparazione documento in corso…', false);

    var timer = setInterval(function () {
        if (Date.now() - t0 > timeoutMs) {
            clearInterval(timer);
            mlReviewSetPdfStatus(
                'Documento non pronto in tempo. Ricarichi la pagina o riprovi dal link ricevuto via email.',
                true
            );
            return;
        }

        fetch(cfg.statusUrl, { cache: 'no-store', credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) {
                    throw new Error('http ' + r.status);
                }
                return r.json();
            })
            .then(function (j) {
                fetchErrors = 0;
                if (j && j.ok && j.ready) {
                    clearInterval(timer);
                    mlReviewSetActionButtonsEnabled(root, true);
                    mlReviewSetPdfStatus('Documento pronto. Può procedere.', false);
                }
            })
            .catch(function () {
                fetchErrors++;
                if (fetchErrors >= 5) {
                    clearInterval(timer);
                    mlReviewSetPdfStatus(
                        'Impossibile verificare il documento. Ricarichi la pagina.',
                        true
                    );
                }
            });
    }, intervalMs);
}

function mlReviewBindButtons(root, cfg) {
    var firma = root.querySelectorAll('.ml-review-firma');
    var accetta = root.querySelectorAll('.ml-review-accetta');
    var rifiuta = root.querySelectorAll('.ml-review-rifiuta');
    var i;
    for (i = 0; i < firma.length; i++) {
        firma[i].onclick = function () {
            if (this.disabled) {
                return;
            }
            // Stesso popup dell'Accetta: conferma rappresentante, poi save → EasyGN.
            mlReviewOpenAccetta(cfg, 'firma');
        };
    }
    for (i = 0; i < accetta.length; i++) {
        accetta[i].onclick = function () {
            if (this.disabled) {
                return;
            }
            mlReviewOpenAccetta(cfg, 'accetta');
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

function mlReviewOpenAccetta(cfg, afterAction) {
    afterAction = afterAction || (mlReviewIsDirectSign(cfg) ? 'firma' : 'accetta');
    var isFirma = afterAction === 'firma';
    var overlay = document.getElementById('ml-review-accetta-overlay');
    if (overlay) {
        var goReuse = document.getElementById('ml-rev-go');
        if (goReuse) {
            goReuse.textContent = isFirma ? 'Conferma e firma' : 'Conferma e invia';
        }
        overlay.setAttribute('data-after', afterAction);
        overlay.style.display = 'flex';
        return;
    }
    overlay = document.createElement('div');
    overlay.id = 'ml-review-accetta-overlay';
    overlay.setAttribute('data-after', afterAction);
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;'
        + 'display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = ''
        + '<div style="max-width:480px;width:100%;background:#fff;border-radius:12px;padding:22px 24px;'
        + 'font-family:Arial,Helvetica,sans-serif;color:#2d3748;">'
        + '<h2 style="margin:0 0 8px;font-size:18px;color:#1a3a5c;">Conferma il rappresentante legale</h2>'
        + '<p style="margin:0 0 16px;font-size:14px;">Controlla i dati prima di '
        + (isFirma ? 'firmare il contratto.' : 'inviare il contratto alla firma.') + '</p>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Nome<br>'
        + '<input id="ml-rev-nome" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Cognome<br>'
        + '<input id="ml-rev-cognome" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 10px;">Email<br>'
        + '<input id="ml-rev-email" type="email" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"></label>'
        + '<label style="display:block;font-size:13px;margin:0 0 16px;">Cellulare<br>'
        + '<input id="ml-rev-tel" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;">'
        + '<span style="display:block;margin-top:4px;font-size:12px;font-weight:normal;color:#718096;">Si prega di aggiungere il prefisso +39 (es. +393331234567).</span>'
        + '</label>'
        + '<p id="ml-rev-err" style="display:none;color:#9b2c2c;font-size:13px;margin:0 0 12px;"></p>'
        + '<div style="display:flex;gap:12px;justify-content:flex-end;">'
        + '<button type="button" id="ml-rev-back" style="padding:10px 16px;border:1px solid #cbd5e0;background:#fff;border-radius:8px;">Indietro</button>'
        + '<button type="button" id="ml-rev-go" style="padding:10px 16px;border:0;background:#5b2d8e;color:#fff;border-radius:8px;font-weight:bold;">'
        + (isFirma ? 'Conferma e firma' : 'Conferma e invia') + '</button>'
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
        // Firma: niente closewin (evita doppia finestra + doppia EasyGN).
        mlReviewTriggerSave({ closewin: !isFirma });
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
            + '<div class="ml-review-bar" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">' + mlReviewButtonsHtml(cfg) + '</div>'
            + '<p id="ml-review-pdf-status" style="margin:8px 0 0;font-size:13px;color:#4a5568;text-align:center;">Preparazione documento in corso…</p>'
            + '<iframe class="ml-review-pdf" title="Anteprima contratto" src="' + (cfg.pdf || '') + '" '
            + 'style="width:100%;height:78vh;border:1px solid #dde1e6;background:#fff;margin-top:12px;"></iframe>'
            + '<div class="ml-review-bar" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:16px;">' + mlReviewButtonsHtml(cfg) + '</div>'
            + '</div>';
        document.body.appendChild(shell);
    }
    mlReviewBindButtons(shell, cfg);
    mlReviewWaitPdfReady(cfg, shell);
}

function mlReviewStart() {
    mlReviewBuild(mlReviewReadCfg());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mlReviewStart);
} else {
    mlReviewStart();
}
