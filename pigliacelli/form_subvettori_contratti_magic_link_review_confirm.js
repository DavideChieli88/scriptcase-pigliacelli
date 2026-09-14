/**
 * Scriptcase — Programming → JavaScript Methods → mlReviewConfirmInit
 *
 * La tua versione SC NON ha "Form → onSubmit": usa JavaScript Methods.
 *
 * DEPLOY:
 * 1) Programming → JavaScript Methods → mlReviewConfirmInit
 *    Incolla TUTTO questo file nel corpo del metodo (senza aggiungere "function mlReviewConfirmInit").
 *    Scriptcase crea già il wrapper function mlReviewConfirmInit() { ... }.
 *
 * 2) Evento PHP onScriptInit: incolla form_subvettori_contratti_magic_link_review_onScriptInit
 *    (avvia il metodo al caricamento pagina).
 *
 * 3) Rigenera la form.
 *
 * NON incollare qui l'auto-init in fondo: parte da onScriptInit.
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

function mlReviewEnsureHiddenConfirm(form) {
    if (!form) {
        return;
    }
    var el = form.querySelector('input[name="review_confirm"]');
    if (!el) {
        el = document.createElement('input');
        el.type = 'hidden';
        el.name = 'review_confirm';
        el.value = '1';
        form.appendChild(el);
    } else {
        el.value = '1';
    }
}

function mlReviewIsSaveControl(el) {
    if (!el) {
        return false;
    }
    if (el.id) {
        var id = String(el.id).toLowerCase();
        if (id.indexOf('sc_b_del') === 0 || id.indexOf('sc_b_new') === 0 || id.indexOf('sc_b_novo') === 0) {
            return false;
        }
        if (id.indexOf('sc_b_upd') === 0 || id.indexOf('sc_b_ins') === 0 || id.indexOf('sc_b_alt') === 0) {
            return true;
        }
    }
    var oc = el.getAttribute ? el.getAttribute('onclick') : '';
    if (oc && (oc.indexOf('alterar') >= 0 || oc.indexOf('incluir') >= 0 || oc.indexOf('update') >= 0 || oc.indexOf('insert') >= 0)) {
        return true;
    }
    return false;
}

function mlReviewConfirmDialogHtml() {
    return ''
        + '<div style="padding:20px 24px 12px;border-bottom:1px solid #e8ebef;background:#fafbfc;">'
        + '<h2 style="margin:0;font-size:18px;line-height:1.35;color:#1a3a5c;">Conferma invio per revisione</h2>'
        + '</div>'
        + '<div style="padding:20px 24px;font-size:15px;line-height:1.55;">'
        + '<p style="margin:0 0 12px;"><strong>Sei sicuro di voler inviare il form per la revisione?</strong></p>'
        + '<p style="margin:0;color:#b45309;">Dopo l\'invio non si potranno più modificare i dati irreversibilmente.</p>'
        + '</div>'
        + '<div style="padding:16px 24px 20px;display:flex;gap:12px;justify-content:flex-end;background:#f8fafc;">'
        + '<button type="button" id="ml-review-btn-back" style="padding:10px 18px;border:1px solid #cbd5e0;'
        + 'background:#fff;border-radius:8px;font-size:14px;cursor:pointer;">Indietro</button>'
        + '<button type="button" id="ml-review-btn-go" style="padding:10px 18px;border:0;background:#1a3a5c;'
        + 'color:#fff;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">Continua</button>'
        + '</div>';
}

function mlReviewShowConfirmOverlay() {
    var overlay = document.getElementById('ml-review-confirm-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        return;
    }

    overlay = document.createElement('div');
    overlay.id = 'ml-review-confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;'
        + 'display:flex;align-items:center;justify-content:center;padding:16px;';

    var box = document.createElement('div');
    box.style.cssText = 'max-width:480px;width:100%;background:#fff;border-radius:12px;'
        + 'border:1px solid #dde1e6;box-shadow:0 12px 32px rgba(0,0,0,.18);'
        + 'font-family:Arial,Helvetica,sans-serif;color:#2d3748;overflow:hidden;';
    box.innerHTML = mlReviewConfirmDialogHtml();

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('ml-review-btn-back').onclick = function () {
        overlay.style.display = 'none';
        window.__mlReviewPendingSave = false;
    };
    document.getElementById('ml-review-btn-go').onclick = function () {
        overlay.style.display = 'none';
        mlReviewTriggerSave();
    };
}

function mlReviewShowConfirm() {
    if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
        Swal.fire({
            title: 'Conferma invio per revisione',
            html: '<p><strong>Sei sicuro di voler inviare il form per la revisione?</strong></p>'
                + '<p style="margin-top:10px;color:#b45309;">Dopo l\'invio la firma del contratto '
                + 'è un passaggio irreversibile.</p>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Continua',
            cancelButtonText: 'Indietro',
            reverseButtons: true,
            focusCancel: true
        }).then(function (result) {
            if (result && (result.isConfirmed === true || result.value === true)) {
                mlReviewTriggerSave();
            } else {
                window.__mlReviewPendingSave = false;
            }
        });
        return;
    }
    mlReviewShowConfirmOverlay();
}

function mlReviewTriggerSave() {
    window.__mlReviewSaveConfirmed = true;
    window.__mlReviewPendingSave = false;
    mlReviewEnsureHiddenConfirm(mlReviewFindForm());

    if (typeof window.nm_atualiza === 'function') {
        window.nm_atualiza('alterar');
        return;
    }
    if (typeof window.nm_gp_submit === 'function') {
        window.nm_gp_submit('update');
        return;
    }

    var btn = document.getElementById('sc_b_upd_t')
        || document.getElementById('sc_b_upd_b')
        || document.getElementById('sc_b_ins_t')
        || document.getElementById('sc_b_ins_b');
    if (btn) {
        btn.click();
        return;
    }

    var form = mlReviewFindForm();
    if (form) {
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
        } else {
            form.submit();
        }
    }
}

function mlReviewShouldIntercept(op) {
    if (window.__mlReviewSaveConfirmed) {
        return false;
    }
    if (op && op !== 'alterar' && op !== 'incluir' && op !== 'update' && op !== 'insert') {
        return false;
    }
    return true;
}

function mlReviewInterceptClick(ev) {
    if (window.__mlReviewSaveConfirmed) {
        return;
    }

    var el = ev.target;
    if (el && el.closest) {
        el = el.closest('[id^="sc_b_"], a, button, input[type="button"], input[type="submit"]') || el;
    }

    if (!mlReviewIsSaveControl(el)) {
        var node = el;
        while (node && node !== document && node.getAttribute) {
            var onclick = node.getAttribute('onclick') || '';
            if (onclick.indexOf('nm_atualiza') >= 0 || onclick.indexOf('nm_gp_submit') >= 0) {
                if (onclick.indexOf('alterar') >= 0 || onclick.indexOf('incluir') >= 0
                    || onclick.indexOf('update') >= 0 || onclick.indexOf('insert') >= 0) {
                    el = node;
                    break;
                }
            }
            node = node.parentNode;
        }
        if (!mlReviewIsSaveControl(el)) {
            return;
        }
    }

    window.__mlReviewPendingSave = true;
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') {
        ev.stopImmediatePropagation();
    }
    mlReviewShowConfirm();
    return false;
}

function mlReviewWrapFn(name, ops) {
    if (typeof window[name] !== 'function' || window['__mlReviewWrapped_' + name]) {
        return;
    }
    window['__mlReviewWrapped_' + name] = true;
    var orig = window[name];
    window[name] = function (op) {
        var opNorm = op;
        if (mlReviewShouldIntercept(opNorm)) {
            window.__mlReviewPendingSave = true;
            mlReviewShowConfirm();
            return false;
        }
        window.__mlReviewSaveConfirmed = false;
        return orig.apply(this, arguments);
    };
}

function mlReviewBindSaveButtons() {
    var selectors = '[id^="sc_b_upd"], [id^="sc_b_ins"], [id^="sc_b_alt"], [onclick*="nm_atualiza"], [onclick*="nm_gp_submit"]';
    var nodes = document.querySelectorAll(selectors);
    var i;
    for (i = 0; i < nodes.length; i++) {
        if (nodes[i].__mlReviewBound) {
            continue;
        }
        if (!mlReviewIsSaveControl(nodes[i])) {
            continue;
        }
        nodes[i].__mlReviewBound = true;
        nodes[i].addEventListener('click', mlReviewInterceptClick, true);
    }
}

function mlReviewBindDocumentClicks() {
    if (window.__mlReviewDocClickBound) {
        return;
    }
    window.__mlReviewDocClickBound = true;
    document.addEventListener('click', mlReviewInterceptClick, true);
}

function mlReviewBindFormSubmit() {
    var form = mlReviewFindForm();
    if (!form || form.__mlReviewSubmitBound) {
        return;
    }
    form.__mlReviewSubmitBound = true;
    form.addEventListener('submit', function (ev) {
        if (window.__mlReviewSaveConfirmed) {
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        window.__mlReviewPendingSave = true;
        mlReviewShowConfirm();
        return false;
    }, true);
}

function mlReviewPollHooks() {
    var attempts = 0;
    var timer = setInterval(function () {
        mlReviewWrapFn('nm_atualiza');
        mlReviewWrapFn('nm_gp_submit');
        mlReviewBindSaveButtons();
        attempts += 1;
        if (attempts >= 50) {
            clearInterval(timer);
        }
    }, 200);
}

function mlReviewRunInit() {
    if (window.__mlReviewConfirmInstalled) {
        mlReviewBindSaveButtons();
        mlReviewBindFormSubmit();
        return;
    }
    window.__mlReviewConfirmInstalled = true;
    window.__mlReviewSaveConfirmed = false;
    window.__mlReviewPendingSave = null;

    mlReviewBindDocumentClicks();
    mlReviewWrapFn('nm_atualiza');
    mlReviewWrapFn('nm_gp_submit');
    mlReviewPollHooks();

    mlReviewBindSaveButtons();
    mlReviewBindFormSubmit();

    setTimeout(mlReviewBindSaveButtons, 300);
    setTimeout(mlReviewBindSaveButtons, 1000);
    setTimeout(mlReviewBindSaveButtons, 2500);
}

// Corpo eseguito quando Scriptcase chiama il metodo mlReviewConfirmInit()
mlReviewRunInit();
