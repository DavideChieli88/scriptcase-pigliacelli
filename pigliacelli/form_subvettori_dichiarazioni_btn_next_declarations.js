/**
 * form_subvettori_dichiarazioni → pulsante JavaScript "Prossimo"
 * (tipo: JavaScript, NON PHP). Nome pulsante: btn_next_declarations
 *
 * IDE: Programming → Buttons → btn_next_declarations → tipo JavaScript.
 * Incolla questo corpo nel pulsante. Il PHP omonimo va svuotato.
 *
 * Chiama il Salva di Scriptcase: onValidate, poi onAfterUpdate.
 * Se la validazione passa, onAfterUpdate apre i documenti.
 * Il cookie dic_go_next distingue Prossimo dal Salva normale:
 * Scriptcase non invia i campi nascosti che non sono della form.
 *
 * NON usare document.F1 da solo: su alcune form non esiste.
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
    var goNext = f.querySelector('input[name="dic_go_next"]');
    if (!goNext) {
        goNext = document.createElement('input');
        goNext.type = 'hidden';
        goNext.name = 'dic_go_next';
        f.appendChild(goNext);
    }
    goNext.value = '1';
}

setTimeout(function () {
    if (typeof scBtnFn_sys_format_alt === 'function') {
        document.cookie = 'dic_go_next=1; path=/';
        scBtnFn_sys_format_alt();
        return;
    }
    if (typeof nm_atualiza === 'function') {
        document.cookie = 'dic_go_next=1; path=/';
        nm_atualiza('alterar');
        return;
    }
    alert('Salva Scriptcase non disponibile (scBtnFn_sys_format_alt).');
}, 500);
