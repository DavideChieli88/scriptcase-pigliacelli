/**
 * Programming → JavaScript Methods → nome: wizChiudiModale
 * (incolla QUESTO come body del metodo)
 *
 * Chiamato da btn_chiudi_modale (PHP) via:
 *   sc_ajax_javascript('wizChiudiModale');
 *
 * Chiude la form aperta in modale/iframe dalla griglia parent.
 */

(function () {
    // 1) Thickbox (modali SC classiche)
    try {
        if (window.parent && typeof window.parent.tb_remove === 'function') {
            window.parent.tb_remove();
            return;
        }
    } catch (e1) {}

    // 2) Navigazione "sai" nella form corrente
    try {
        if (typeof nm_move === 'function') {
            nm_move('sai');
            return;
        }
    } catch (e2) {}

    // 3) Stesso sul parent
    try {
        if (window.parent && typeof window.parent.nm_move === 'function') {
            window.parent.nm_move('sai');
            return;
        }
    } catch (e3) {}

    // 4) Fallback DOM modal / thickbox residuale
    try {
        if (window.parent && window.parent.jQuery) {
            var $p = window.parent.jQuery;
            $p('#TB_overlay, #TB_window, #TB_iframeContent').remove();
            $p('.modal:visible, .sc-ui-modal:visible, [id^="sc-ui-modal"]').hide();
            return;
        }
    } catch (e4) {}
})();
