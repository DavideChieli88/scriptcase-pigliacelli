/**
 * form_documenti → pulsante JavaScript "Invia per correzione"
 * Nome pulsante: btn_invia_correzione
 *
 * IDE: Programming → Buttons → btn_invia_correzione → tipo JavaScript.
 * Incolla questo corpo. Niente PHP sul pulsante.
 *
 * Segna il documento da correggere con lo stesso salvataggio di prima
 * (onAfterUpdate: stato da revisionare + avviso al subvettore).
 * Il cookie dura un solo salvataggio: onAfterUpdate lo cancella.
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

if (f) {
    var flag = f.querySelector('input[name="is_not_ok"]');
    if (!flag) {
        flag = f.querySelector('[name="is_not_ok"]');
    }
    if (flag) {
        if (flag.type === 'checkbox') {
            flag.checked = true;
        }
        flag.value = '1';
    }
}

document.cookie = 'doc_invia_correzione=1; path=/';

if (typeof scBtnFn_sys_format_alt === 'function') {
    scBtnFn_sys_format_alt();
} else if (typeof nm_atualiza === 'function') {
    nm_atualiza('alterar');
} else {
    alert('Salva Scriptcase non disponibile.');
}
