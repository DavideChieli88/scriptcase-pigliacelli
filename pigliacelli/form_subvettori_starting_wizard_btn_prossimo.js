/**
 * form_subvettori_starting_wizard → pulsante JavaScript "Prossimo"
 * (tipo: JavaScript, NON PHP)
 *
 * NON usare document.F1: su questa form spesso non esiste →
 *   Uncaught TypeError: Cannot set properties of undefined (setting 'value')
 *
 * closewin è opzionale: se manca, si salta. Il redirect lo fa onAfterUpdate.
 * Salva SC mascherato con wizStep1HideSaveInit (opacity, NON display:none).
 */

var f = null;
if (typeof document.F1 !== 'undefined' && document.F1) {
    f = document.F1;
} else if (document.forms && document.forms['F1']) {
    f = document.forms['F1'];
} else {
    f = document.querySelector('form[name^="form_"]')
        || document.querySelector('form#F1')
        || (document.forms && document.forms.length ? document.forms[0] : null);
}

if (f && f.closewin) {
    try {
        f.closewin.value = 'Y';
    } catch (e) {
        /* ignore */
    }
}

setTimeout(function () {
    if (typeof scBtnFn_sys_format_alt === 'function') {
        scBtnFn_sys_format_alt();
        return;
    }
    if (typeof nm_atualiza === 'function') {
        nm_atualiza('alterar');
        return;
    }
    alert('Salva Scriptcase non disponibile (scBtnFn_sys_format_alt).');
}, 500);
