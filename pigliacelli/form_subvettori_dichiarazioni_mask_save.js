/**
 * form_subvettori_dichiarazioni
 * Programming → JavaScript Methods → nome: dicMaskSave
 *
 * Incolla SOLO il corpo sotto. Scriptcase lo avvolge già in
 * function dicMaskSave() { ... }.
 *
 * Dichiarazione firmata nel wizard: il Salva resta nel DOM
 * (scBtnFn_sys_format_alt non parte se il pulsante è display:none)
 * ma non è cliccabile. Prossimo lo invoca comunque.
 */

function dicMaskSaveButton(el) {
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

var dicMaskSaveAttempts = 0;

function dicMaskSaveTick() {
    var found = false;
    var nodes = document.querySelectorAll('[id^="sc_b_upd"]');
    var i;

    for (i = 0; i < nodes.length; i++) {
        dicMaskSaveButton(nodes[i]);
        found = true;
    }

    if (!found) {
        var el = document.getElementById('sc_b_upd_b') || document.getElementById('sc_b_upd_t');
        if (el) {
            dicMaskSaveButton(el);
            found = true;
        }
    }

    if (found) {
        return;
    }

    dicMaskSaveAttempts += 1;
    if (dicMaskSaveAttempts < 40) {
        setTimeout(dicMaskSaveTick, 150);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dicMaskSaveTick);
} else {
    dicMaskSaveTick();
}
