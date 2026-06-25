/**
 * Pulsante toolbar Javascript SC: save_and_send_magic_link
 *
 * Il Salva SC usa: onclick="scBtnFn_sys_format_alt(); return false;"
 * Con submit Ajax, i hidden aggiunti via DOM NON vengono inviati al server.
 * Usiamo un cookie letto in onBeforeUpdate.
 *
 * Incollare tutto nel campo JS del pulsante (senza function wrapper esterno).
 */

function scFormSetSendMagicLinkCookie() {
    var expires = new Date();
    expires.setTime(expires.getTime() + 120000);
    document.cookie = 'pigliacelli_send_ml=1; path=/; SameSite=Lax; expires=' + expires.toUTCString();
}

function scFormEnsureSendMagicLinkFlag(form) {
    if (!form) {
        return;
    }
    var el = form.querySelector('input[name="send_magic_link_after"]');
    if (!el) {
        el = document.createElement('input');
        el.type = 'hidden';
        el.name = 'send_magic_link_after';
        form.appendChild(el);
    }
    el.value = '1';
}

function scFormFindMain() {
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
    if (typeof document.F1 !== 'undefined' && document.F1) {
        return document.F1;
    }
    return forms.length ? forms[0] : null;
}

function saveAndSendMagicLinkClick() {
    scFormSetSendMagicLinkCookie();
    scFormEnsureSendMagicLinkFlag(scFormFindMain());

    if (typeof window.scBtnFn_sys_format_alt === 'function') {
        window.scBtnFn_sys_format_alt();
        return;
    }

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
    }
}

saveAndSendMagicLinkClick();
