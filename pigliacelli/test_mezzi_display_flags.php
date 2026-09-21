<?php
/**
 * Test locale: con flag 000 i campi Cat.4/5 devono essere off.
 * Esegue la stessa logica di calcolo usata in onLoad (senza macro SC).
 */

function mez_calc_display($flag1, $flag4, $flag5)
{
    $out = array();

    $state1 = ($flag1 === 1) ? 'on' : 'off';
    $state4 = ($flag4 === 1) ? 'on' : 'off';
    $state5 = ($flag5 === 1) ? 'on' : 'off';
    $stateRentri = ($flag1 === 1 || $flag4 === 1 || $flag5 === 1) ? 'on' : 'off';

    foreach (array('anga_cat_1', 'scadenza_anga_cat_1', 'ricevuta_anga_cat_1', 'scadenza_ricevuta_anga_cat_1') as $f) {
        $out[$f] = $state1;
    }
    foreach (array('anga_cat_4', 'scadenza_anga_cat_4', 'ricevuta_anga_cat_4', 'scadenza_ricevuta_anga_cat_4') as $f) {
        $out[$f] = $state4;
    }
    foreach (array('anga_cat_5', 'scadenza_anga_cat_5', 'ricevuta_anga_cat_5', 'scadenza_ricevuta_anga_cat_5') as $f) {
        $out[$f] = $state5;
    }
    foreach (array('rentri_iscrizione', 'ricevuta_rentri', 'scadenza_ricevuta_rentri') as $f) {
        $out[$f] = $stateRentri;
    }

    return $out;
}

function assert_fields_off(array $display, array $fields, $label)
{
    $ok = true;
    foreach ($fields as $f) {
        if (!isset($display[$f]) || $display[$f] !== 'off') {
            echo "FAIL {$label}: {$f}=" . (isset($display[$f]) ? $display[$f] : 'MISSING') . PHP_EOL;
            $ok = false;
        }
    }
    if ($ok) {
        echo "PASS {$label}" . PHP_EOL;
    }
    return $ok;
}

$allOk = true;

// Caso richiesto: flag 000
$d = mez_calc_display(0, 0, 0);
$mustOff = array('anga_cat_4', 'anga_cat_5', 'ricevuta_anga_cat_4', 'ricevuta_anga_cat_5');
$allOk = assert_fields_off($d, $mustOff, 'flag=000 Cat.4/5 nascosti') && $allOk;

// Extra: anche Cat.1 e RENTRI off con 000
$allOk = assert_fields_off(
    $d,
    array('anga_cat_1', 'ricevuta_anga_cat_1', 'rentri_iscrizione'),
    'flag=000 Cat.1/RENTRI nascosti'
) && $allOk;

// Smoke: flag 100 => Cat.1 on, Cat.4/5 off
$d100 = mez_calc_display(1, 0, 0);
if ($d100['anga_cat_1'] === 'on'
    && $d100['ricevuta_anga_cat_1'] === 'on'
    && $d100['anga_cat_4'] === 'off'
    && $d100['ricevuta_anga_cat_4'] === 'off'
    && $d100['anga_cat_5'] === 'off'
    && $d100['ricevuta_anga_cat_5'] === 'off'
    && $d100['rentri_iscrizione'] === 'on'
) {
    echo "PASS flag=100 Cat.1 on, Cat.4/5 off, RENTRI on" . PHP_EOL;
} else {
    echo "FAIL flag=100" . PHP_EOL;
    $allOk = false;
}

exit($allOk ? 0 : 1);
