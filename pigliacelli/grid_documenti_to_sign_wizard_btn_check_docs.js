/**
 * grid_documenti_to_sign_wizard → pulsante Toolbar tipo JavaScript
 * (NON evento PHP: qui le graffe sono JS, non campi SC)
 *
 * Chiama blank_wizard_firma_documenti ?subvettoreId=&created_at=
 * Se docs > 0 (documenti verdi aggiornati dopo la soglia) →
 *   aggiorna created_at all'ora UTC attuale e nm_gp_submit_ajax('igual', 'breload').
 * Se docs === 0 non ricarica.
 *
 * La soglia resta l'ultimo aggiornamento trovato, anche dopo il reload
 * (localStorage + window.wizCreatedAt).
 */

function wizUtcNow() {
    var d = new Date();
    function p(n) {
        return (n < 10 ? "0" : "") + n;
    }
    return d.getUTCFullYear()
        + "-" + p(d.getUTCMonth() + 1)
        + "-" + p(d.getUTCDate())
        + " " + p(d.getUTCHours())
        + ":" + p(d.getUTCMinutes())
        + ":" + p(d.getUTCSeconds());
}

var subId = "[subvettoreId]";
var storageKey = "wizCreatedAt_" + subId;
if (!window.wizCreatedAt) {
    var saved = "";
    try {
        saved = localStorage.getItem(storageKey) || "";
    } catch (e1) {
        saved = "";
    }
    window.wizCreatedAt = saved || wizUtcNow();
}

var url = "../blank_wizard_firma_documenti/"
    + "?subvettoreId=" + encodeURIComponent(subId)
    + "&created_at=" + encodeURIComponent(window.wizCreatedAt);

fetch(url, { credentials: "same-origin" })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        console.log("wizVerdi check", data);
        var n = 0;
        if (data && typeof data.docs !== "undefined") {
            n = parseInt(data.docs, 10);
        }
        if (n > 0) {
            window.wizCreatedAt = wizUtcNow();
            try {
                localStorage.setItem(storageKey, window.wizCreatedAt);
            } catch (e2) { }
            nm_gp_submit_ajax("igual", "breload");
        }
    })
    .catch(function (e) {
        console.log("wizVerdi check ERR", e);
    });

if (!window.wizRefreshTimer) {
    window.wizRefreshTimer = setInterval(function () {
        wizHideRefreshBtn();
        var b = document.getElementById("sc_hidden_refresh_top");
        if (b) {
            b.click();
        }
    }, 20000);
}
