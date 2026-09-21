/**
 * Programming → JavaScript Methods → mlReviewHideSaveInit
 *
 * Nasconde il Salva SC senza display:none (display:none può bloccare scBtnFn_sys_format_alt).
 * opacity 0 + pointer-events:none → non cliccabile, id resta nel DOM.
 *
 * onScriptInit:
 *   sc_ajax_javascript('mlReviewHideSaveInit');
 *
 * In Scriptcase: incolla SOLO il corpo sotto nel metodo già esistente
 * (SC avvolge già in function mlReviewHideSaveInit() { ... }).
 *
 * displayChange_page: residuo wizard multi-step SC. Deve stare su window
 * (dentro il metodo SC una function locale NON è visibile a scJQWizardGoToStep).
 * Se l'errore resta in console, lo stub è troppo tardi: metterlo anche in
 * Layout → JavaScript (globale, non JavaScript Method).
 */

window.displayChange_page = function () {};

function mlReviewMaskSaveButton(el) {
    if (!el) {
        return;
    }
    el.style.display = 'block';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-hidden', 'true');
}

var mlReviewHideSaveAttempts = 0;

function mlReviewHideSaveTick() {
    var found = false;
    var nodes = document.querySelectorAll('[id^="sc_b_upd"]');
    var i;

    for (i = 0; i < nodes.length; i++) {
        mlReviewMaskSaveButton(nodes[i]);
        found = true;
    }

    if (!found) {
        var el = document.getElementById('sc_b_upd_b') || document.getElementById('sc_b_upd_t');
        if (el) {
            mlReviewMaskSaveButton(el);
            found = true;
        }
    }

    if (found) {
        return;
    }

    mlReviewHideSaveAttempts += 1;
    if (mlReviewHideSaveAttempts < 40) {
        setTimeout(mlReviewHideSaveTick, 150);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mlReviewHideSaveTick);
} else {
    mlReviewHideSaveTick();
}
