/**
 * Opzionale — Programming → JavaScript Methods → nome: ncqChiudiModale
 *
 * Alternativa a btn_annulla PHP se preferisci chiudere solo la Thickbox
 * senza navigare il parent (la griglia resta com'era).
 *
 * Buttons → JavaScript → Code: ncqChiudiModale();
 */
(function () {
    try {
        if (window.parent && typeof window.parent.tb_remove === 'function') {
            window.parent.tb_remove();
            return;
        }
    } catch (e1) {}

    try {
        if (window.parent && window.parent.jQuery) {
            var $p = window.parent.jQuery;
            $p('#TB_overlay, #TB_window, #TB_iframeContent').remove();
            $p('.modal:visible, .sc-ui-modal:visible, [id^="sc-ui-modal"]').hide();
            return;
        }
    } catch (e2) {}

    // Fallback: stessa destinazione di btn_annulla
    try {
        if (window.parent) {
            window.parent.location.href = '../grid_contratti/';
        } else {
            window.location.href = '../grid_contratti/';
        }
    } catch (e3) {
        window.location.href = '../grid_contratti/';
    }
})();
