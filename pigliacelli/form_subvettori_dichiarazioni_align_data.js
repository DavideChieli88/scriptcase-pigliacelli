/**
 * form_subvettori_dichiarazioni
 * Programming → JavaScript Methods → nome: dicAlignData
 *
 * Incolla SOLO il corpo sotto. Scriptcase lo avvolge già in
 * function dicAlignData() { ... }.
 *
 * onScriptInit: sc_ajax_javascript('dicAlignData');
 *
 * Stesso effetto della console. Il retry copre il disegno dei blocchi,
 * che arriva dopo la prima chiamata.
 */

var dicAlignTries = 0;

function dicAlignTick() {
    document.querySelectorAll('[id^="hidden_field_data_"]').forEach(el => {
        el.style.textAlign = "right";
        el.style.width = "auto";
        el.querySelectorAll("input, textarea").forEach(inp => {
            inp.style.textAlign = "right";
        });
    });
    dicAlignTries += 1;
    if (dicAlignTries < 25) {
        setTimeout(dicAlignTick, 200);
    }
}

dicAlignTick();
