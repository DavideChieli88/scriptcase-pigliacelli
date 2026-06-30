/**
 * Programming → JavaScript Methods → mlReviewHideSaveInit
 *
 * Incolla nel corpo del metodo (SC aggiunge function mlReviewHideSaveInit() { ... }).
 * Richiamato da onScriptInit con sc_ajax_javascript('mlReviewHideSaveInit') — mai <script> in PHP.
 */

var n = 0;

function mlReviewHideSaveTick() {
    var el = document.getElementById('sc_b_upd_b') || document.getElementById('sc_b_upd_t');
    if (el) {
        el.style.display = 'none';
        return;
    }
    n += 1;
    if (n < 40) {
        setTimeout(mlReviewHideSaveTick, 150);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mlReviewHideSaveTick);
} else {
    mlReviewHideSaveTick();
}
