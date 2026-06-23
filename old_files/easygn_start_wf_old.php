$contrattoId = (int)[contrattoId];
if ($contrattoId <= 0) sc_error_message("contrattoId mancante o non valido");

$subvettoreId = (int)[subvettoreId];
if ($subvettoreId <= 0) sc_error_message("subvettoreId mancante o non valido");

$tipoContrattoId = (int)[tipo_contratto_id];

$log = function ($msg) use ($contrattoId, $subvettoreId, $tipoContrattoId) {
    sc_log_add('EASYGN', "[contrattoId=$contrattoId][subvettoreId=$subvettoreId][tipoContrattoId=$tipoContrattoId] " . (string)$msg);
};

$log("start blank");

$fail = function ($msg) use ($log) {
    $log("FAIL: " . (string)$msg);
    if (function_exists('sc_error_message')) {
        sc_error_message((string)$msg);
    }
    if (function_exists('sc_alert')) {
        sc_alert((string)$msg);
    }
    die((string)$msg);
};

$sc_setting = function ($name, $default = '') {
    $val = $default;
    $safeName = str_replace("'", "''", trim((string)$name));

    sc_lookup(rsSet, "SELECT set_value FROM sec_settings WHERE set_name = '" . $safeName . "' LIMIT 1");
    if (isset({rsSet[0][0]})) {
        $val = (string){rsSet[0][0]};
        return $val;
    }
    return $val;
};

// Doppia firma (vettore + committente): sec_settings `easygn_doppia_firma` = 1|true|yes|si
$doppiaFirmaRaw = strtolower(trim($sc_setting('easygn_doppia_firma', '')));
$doppiaFirma = in_array($doppiaFirmaRaw, ['1', 'true', 'yes', 'si', 'sì'], true);
$log('doppia_firma=' . ($doppiaFirma ? '1' : '0'));

$bearer = trim($sc_setting('easygn_bearer', ''));
if ($bearer === '') $fail("Bearer Easygn mancante in sec_settings (easygn_bearer)");

$easygnBaseUrl = rtrim(trim($sc_setting('easygn_base_url', 'https://easygn.digiwebuno.it/api')), '/');
$log("config ok baseUrl=$easygnBaseUrl");

// 1) Recupero PDF del contratto
$pdfFilename = '';
$pdfB64 = '';
$pdfPathUsed = '';

$baseDir = rtrim((string)$sc_setting('contratti_base_dir', ''), "/\\");
if ($baseDir === '') {
    $baseDir = rtrim((string)$sc_setting('templates_path', ''), "/\\");
    if (preg_match('#/templates$#', str_replace('\\', '/', $baseDir))) {
        $baseDir = preg_replace('#/templates$#', '', str_replace('\\', '/', $baseDir));
    }
}
if ($baseDir === '') {
    $fail("Imposta `sec_settings.contratti_base_dir` (consigliato) oppure `sec_settings.templates_path` (directory dove risiedono i PDF).");
}
$log("pdf baseDir=" . $baseDir);

sc_lookup(rsBlob, "
    SELECT file
    FROM contratti
    WHERE id = $contrattoId
    LIMIT 1
");
if (isset({rsBlob[0][0]})) {
    $blob = {rsBlob[0][0]};
 
    if (is_string($blob) && $blob !== '') {
        if (strncmp($blob, "%PDF", 4) === 0) {
            $pdfB64 = base64_encode($blob);
            $pdfFilename = 'contratto_' . $contrattoId . '.pdf';
        } else {
         
            $maybeFilename = trim((string)$blob);
            if ($maybeFilename !== '' && stripos($maybeFilename, '.pdf') !== false) {
                $pdfFilename = $maybeFilename;
                $pdfRel = ltrim(str_replace('\\', '/', $pdfFilename), '/');
                $pdfPath = '';

                // Se il valore sembra già un path assoluto provo direttamente.
                $maybePath = str_replace('\\', '/', $pdfFilename);
                if (strpos($maybePath, '/') === 0) {
                    if (is_readable($maybePath)) {
                        $pdfPath = $maybePath;
                        $pdfPathUsed = $maybePath;
                    }
                }

                if ($pdfPath === '') {
                    $try = rtrim((string)$baseDir, "/\\") . '/' . $pdfRel;
                    if (!is_readable($try)) {
                        $log("pdf NOT readable: $try");
                        $fail("PDF non leggibile su disco.\nPath: $try");
                    }
                    $pdfPath = $try;
                    $pdfPathUsed = $try;
                }
                $bin = file_get_contents($pdfPath);
                if ($bin === false || $bin === '') {
    $fail("Lettura PDF fallita: $pdfPath");
                }
                if (strncmp($bin, "%PDF", 4) !== 0) {
    $fail("File non sembra un PDF valido: $pdfPath");
                }
                $pdfB64 = base64_encode($bin);
            }
        }
    }
}

if ($pdfB64 === '') {
    $log("pdf blob vuoto");
    $fail("PDF non presente in contratti.file (BLOB) per contratto $contrattoId");
}
$log("pdf ok filename=$pdfFilename b64_len=" . strlen($pdfB64) . " path=" . (string)$pdfPathUsed);

// 2) Recupero dati firmatario (vettore) da subvettori_contratti: priorità *_firmatario, altrimenti *_rappresentante.
//    Doppia firma: anche committente (email_committente, telefono_committente, nome_committente, cognome_committente).
//    Esempio colonne: ALTER TABLE subvettori_contratti ADD COLUMN email_committente VARCHAR(255) NULL;
//      ADD COLUMN telefono_committente VARCHAR(64) NULL; ADD COLUMN nome_committente VARCHAR(128) NULL;
//      ADD COLUMN cognome_committente VARCHAR(128) NULL;
$signerEmail = '';
$signerPhone = '';
$signerName = '';
$signerSurname = '';

$subvCols = "
        id,
        email_firmatario,
        email_rappresentante,
        telefono_firmatario,
        telefono_rappresentante,
        nome_firmatario,
        cognome_firmatario,
        nome_rappresentante,
        cognome_rappresentante
";
if ($doppiaFirma) {
    $subvCols .= ",
        email_committente,
        telefono_committente,
        nome_committente,
        cognome_committente
    ";
}
sc_lookup(rsSubvContr, "
    SELECT
        $subvCols
    FROM subvettori_contratti
    WHERE contratto_id = $contrattoId
      AND subvettore_id = $subvettoreId
    LIMIT 1
");
if (!isset({rsSubvContr[0][0]}) || (int){rsSubvContr[0][0]} <= 0) {
    $fail("Nessuna riga in subvettori_contratti per contratto_id=$contrattoId e subvettore_id=$subvettoreId.");
}

$emailF = isset({rsSubvContr[0][1]}) ? trim((string){rsSubvContr[0][1]}) : '';
$emailR = isset({rsSubvContr[0][2]}) ? trim((string){rsSubvContr[0][2]}) : '';
$telF = isset({rsSubvContr[0][3]}) ? trim((string){rsSubvContr[0][3]}) : '';
$telR = isset({rsSubvContr[0][4]}) ? trim((string){rsSubvContr[0][4]}) : '';
$nomeF = isset({rsSubvContr[0][5]}) ? trim((string){rsSubvContr[0][5]}) : '';
$cognomeF = isset({rsSubvContr[0][6]}) ? trim((string){rsSubvContr[0][6]}) : '';
$nomeR = isset({rsSubvContr[0][7]}) ? trim((string){rsSubvContr[0][7]}) : '';
$cognomeR = isset({rsSubvContr[0][8]}) ? trim((string){rsSubvContr[0][8]}) : '';

$signerEmail = $emailF !== '' ? $emailF : $emailR;
$signerPhone = $telF !== '' ? $telF : $telR;

if ($nomeF !== '' || $cognomeF !== '') {
    $signerName = $nomeF;
    $signerSurname = $cognomeF;
} else {
    $signerName = $nomeR;
    $signerSurname = $cognomeR;
}

if ($signerEmail === '') {
    $fail("Email firmatario mancante in subvettori_contratti (email_firmatario / email_rappresentante).");
}
if ($signerPhone === '') {
    $fail("Telefono firmatario mancante in subvettori_contratti (telefono_firmatario / telefono_rappresentante).");
}
if ($signerName === '') {
    $fail("Nome firmatario mancante in subvettori_contratti (nome_firmatario+cognome_firmatario o nome_rappresentante+cognome_rappresentante).");
}
$log("signer vettore ok email=$signerEmail phone=$signerPhone name=$signerName $signerSurname");

// Normalizza telefono: swagger di solito vuole +39xxxxxxxxxx
if ($signerPhone !== '' && $signerPhone[0] !== '+') {
    $digits = preg_replace('/\D+/', '', $signerPhone);
    if ($digits !== '') {
        $signerPhone = '+39' . $digits;
    }
}

// Easygn: alcuni validatori rifiutano caratteri "speciali" nel cognome (es: punti, slash, ecc.)
$signerSurnameClean = trim((string)$signerSurname);
$signerSurnameClean = preg_replace("/[^A-Za-zÀ-ÿ'\\-\\s]/u", ' ', $signerSurnameClean);
$signerSurnameClean = preg_replace('/\s+/u', ' ', (string)$signerSurnameClean);
$signerSurnameClean = trim((string)$signerSurnameClean);
if ($signerSurnameClean === '') {
    $signerSurnameClean = 'NA';
}

// Committente (secondo firmatario) — colonne su subvettori_contratti, solo se doppia firma
$commEmail = '';
$commPhone = '';
$commName = '';
$commSurname = '';
$commSurnameClean = 'NA';
if ($doppiaFirma) {
    $commEmail = isset({rsSubvContr[0][9]}) ? trim((string){rsSubvContr[0][9]}) : '';
    $commPhone = isset({rsSubvContr[0][10]}) ? trim((string){rsSubvContr[0][10]}) : '';
    $commName = isset({rsSubvContr[0][11]}) ? trim((string){rsSubvContr[0][11]}) : '';
    $commSurname = isset({rsSubvContr[0][12]}) ? trim((string){rsSubvContr[0][12]}) : '';
    if ($commEmail === '') {
        $fail("Doppia firma attiva: email committente mancante (subvettori_contratti.email_committente).");
    }
    if ($commPhone === '') {
        $fail("Doppia firma attiva: telefono committente mancante (subvettori_contratti.telefono_committente).");
    }
    if ($commName === '') {
        $fail("Doppia firma attiva: nome committente mancante (subvettori_contratti.nome_committente).");
    }
    if ($commPhone !== '' && $commPhone[0] !== '+') {
        $digitsC = preg_replace('/\D+/', '', $commPhone);
        if ($digitsC !== '') {
            $commPhone = '+39' . $digitsC;
        }
    }
    $commSurnameClean = trim((string)$commSurname);
    $commSurnameClean = preg_replace("/[^A-Za-zÀ-ÿ'\\-\\s]/u", ' ', $commSurnameClean);
    $commSurnameClean = preg_replace('/\s+/u', ' ', (string)$commSurnameClean);
    $commSurnameClean = trim((string)$commSurnameClean);
    if ($commSurnameClean === '') {
        $commSurnameClean = 'NA';
    }
    $log("signer committente ok email=$commEmail phone=$commPhone name=$commName $commSurname");
}

// 4) Coordinate firma (mm): vettore = easygn_sign_* + easygn_sign2_*; committente = easygn_committente_sign_* + easygn_committente_sign2_* (solo doppia firma).
//    Con tipo_contratto_id = 1 e una sola firma resta il layout a 6 aree hardcoded; con doppia firma quel layout non si usa (coordinate da sec_settings per entrambi).
$build_visual_mm_list = function ($pfx, $pfx2) use ($sc_setting) {
    $mm = [
        'page' => (int)$sc_setting($pfx . 'page', '1'),
        'x'    => (float)$sc_setting($pfx . 'x_mm', '203.5'),
        'y'    => (float)$sc_setting($pfx . 'y_mm', '129'),
        'w'    => (float)$sc_setting($pfx . 'w_mm', '85.01'),
        'h'    => (float)$sc_setting($pfx . 'h_mm', '27.51'),
    ];
    $list = [$mm];
    $mm2 = [
        'page' => (int)$sc_setting($pfx2 . 'page', '0'),
        'x'    => (float)$sc_setting($pfx2 . 'x_mm', '0'),
        'y'    => (float)$sc_setting($pfx2 . 'y_mm', '0'),
        'w'    => (float)$sc_setting($pfx2 . 'w_mm', '0'),
        'h'    => (float)$sc_setting($pfx2 . 'h_mm', '0'),
    ];
    if ($mm2['page'] > 0 && $mm2['w'] > 0 && $mm2['h'] > 0) {
        $list[] = $mm2;
    }

    return $list;
};

$easygn_sign_mm_tipo_1 = function () {
    return [
        ['page' => 1, 'x' => 160, 'y' => 12.5, 'w' => 32.51, 'h' => 5.01],
        ['page' => 3, 'x' => 117.5, 'y' => 287, 'w' => 87.51, 'h' => 8.01],
        ['page' => 10, 'x' => 15, 'y' => 257.5, 'w' => 77.51, 'h' => 7.51],
        ['page' => 10, 'x' => 95, 'y' => 257.5, 'w' => 105.01, 'h' => 7.51],
        ['page' => 11, 'x' => 15, 'y' => 50, 'w' => 85.01, 'h' => 12.51],
        ['page' => 11, 'x' => 105, 'y' => 50, 'w' => 100.01, 'h' => 12.51],
    ];
};

if ($doppiaFirma) {
    $visualsMmListVettore = $build_visual_mm_list('easygn_sign_', 'easygn_sign2_');
    $visualsMmListComm = $build_visual_mm_list('easygn_committente_sign_', 'easygn_committente_sign2_');
    $c0 = $visualsMmListComm[0];
    if ((int)$c0['page'] <= 0 || (float)$c0['w'] <= 0 || (float)$c0['h'] <= 0) {
        $fail("Doppia firma: imposta in sec_settings easygn_committente_sign_page / _x_mm / _y_mm / _w_mm / _h_mm (prima area committente).");
    }
    $log('sign coords: doppia firma — vettore easygn_sign_*, committente easygn_committente_sign_* (count v=' . count($visualsMmListVettore) . ' c=' . count($visualsMmListComm) . ')');
} elseif ((int)$tipoContrattoId === 1) {
    $visualsMmListVettore = $easygn_sign_mm_tipo_1();
    $visualsMmListComm = [];
    $log('sign coords: tipo_contratto_id=1 (6 aree, un firmatario)');
} else {
    $visualsMmListVettore = $build_visual_mm_list('easygn_sign_', 'easygn_sign2_');
    $visualsMmListComm = [];
    $log('sign coords: default sec_settings easygn_sign_* (count=' . count($visualsMmListVettore) . ')');
}

$mm_to_pt = function ($mmVal) { return $mmVal * 72 / 25.4; };
$easygn_position_from_mm = function ($pageMm) use ($mm_to_pt) {
    // A4 portrait: 595.28 x 841.89 pt (altezza in pt)
    $pageHeightPt = 841.89;
    $xPt = $mm_to_pt($pageMm['x']);
    $yTopPt = $mm_to_pt($pageMm['y']);
    $wPt = $mm_to_pt($pageMm['w']);
    $hPt = $mm_to_pt($pageMm['h']);

    $x1 = $xPt;
    $x2 = $xPt + $wPt;
    $y1 = $pageHeightPt - $yTopPt - $hPt; // bottom
    $y2 = $y1 + $hPt;

    return implode(',', array_map(fn($v) => (string)round($v), [$x1, $y1, $x2, $y2]));
};
$easygn_visual_from_mm = function ($pageMm) use ($mm_to_pt, $easygn_position_from_mm) {
    $xPt = (int)round($mm_to_pt($pageMm['x']));
    $yTopPt = (int)round($mm_to_pt($pageMm['y']));
    $wPt = (int)round($mm_to_pt($pageMm['w']));
    $hPt = (int)round($mm_to_pt($pageMm['h']));
    if ($hPt < 37) $hPt = 37; // vincolo API

    return [
        "page" => (int)$pageMm['page'],
        "width" => $wPt,
        "height" => $hPt,
        "x" => $xPt,
        "y" => $yTopPt,
        "position" => $easygn_position_from_mm($pageMm),
    ];
};

$signerVisualsVettore = array_values(array_filter(
    array_map(fn($pageMm) => $easygn_visual_from_mm($pageMm), $visualsMmListVettore),
    fn($v) => is_array($v)
));
$signerVisualsCommittente = [];
if ($doppiaFirma && $visualsMmListComm !== []) {
    $signerVisualsCommittente = array_values(array_filter(
        array_map(fn($pageMm) => $easygn_visual_from_mm($pageMm), $visualsMmListComm),
        fn($v) => is_array($v)
    ));
}

// 5) Chiamate Easygn (senza wrapper)
$easygn_request = function ($method, $url, $bearerKy, $jsonPayload = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);

    $headers = ['Accept: application/json', 'Authorization: Bearer ' . $bearerKy];
    if ($jsonPayload !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return [false, "cURL error $errno: $err", $http, $body];
    }
    if ($http < 200 || $http >= 300) {
        return [false, "HTTP $http", $http, $body];
    }
    return [true, "", $http, $body];
};

$preview_body = function ($body, $max = 600) {
    $s = (string)$body;
    $s = preg_replace('/\s+/u', ' ', $s);
    if ($s === null) $s = (string)$body;
    if (strlen($s) > $max) $s = substr($s, 0, $max) . '...';
    return $s;
};

// Estrae un link di firma da una risposta Easygn (chiavi note + fallback ricorsivo su URL "da firma")
$extract_sign_link = function ($data) {
    if (!is_array($data)) return '';

    $isHttpUrl = function ($s) {
        $s = trim((string)$s);
        return $s !== '' && preg_match('#^https?://#i', $s) === 1;
    };

    // Chiavi esplicite (snake + camel come in molti swagger)
    $signerKeys = [
        'link', 'url', 'href',
        'sign_url', 'signUrl', 'sign_link', 'signLink',
        'signing_url', 'signingUrl', 'signingLink', 'signing_link',
        'invitation_url', 'invitationUrl', 'invite_url', 'inviteUrl',
        'signature_url', 'signatureUrl', 'web_url', 'webUrl',
        'redirect_url', 'redirectUrl', 'callback_url', 'callbackUrl',
    ];
    $signersList = $data['files'][0]['signers'] ?? null;
    if (is_array($signersList)) {
        foreach ($signersList as $signerRow) {
            if (!is_array($signerRow)) {
                continue;
            }
            foreach ($signerKeys as $k) {
                if (!array_key_exists($k, $signerRow)) {
                    continue;
                }
                $c = $signerRow[$k];
                if (is_string($c) && $isHttpUrl($c)) {
                    return trim($c);
                }
            }
        }
    }

    $candidates = [
        $data['link'] ?? null,
        $data['url'] ?? null,
        $data['signUrl'] ?? null,
        $data['sign_link'] ?? null,
    ];
    if (is_array($signersList)) {
        foreach ($signersList as $signerRow) {
            if (!is_array($signerRow)) {
                continue;
            }
            $candidates[] = $signerRow['link'] ?? null;
            $candidates[] = $signerRow['url'] ?? null;
            $candidates[] = $signerRow['sign_url'] ?? null;
        }
    }
    foreach ($candidates as $c) {
        if (is_string($c) && trim($c) !== '') return trim($c);
    }

    $looksLikeSignUrl = function ($s) {
        $s = trim((string)$s);
        if ($s === '' || preg_match('#^https?://#i', $s) !== 1) return false;
        // Evita di prendere URL generici (es. solo api base); richiede indizi da flusso firma
        return stripos($s, 'sign') !== false
            || stripos($s, 'firma') !== false
            || stripos($s, 'invitation') !== false
            || stripos($s, 'invite') !== false
            || stripos($s, '/platform/') !== false
            || stripos($s, 'signature') !== false
            || stripos($s, 'workflow') !== false;
    };

    $found = '';
    $walker = function ($v) use (&$walker, &$found, $looksLikeSignUrl) {
        if ($found !== '') return;
        if (is_string($v)) {
            if ($looksLikeSignUrl($v)) {
                $found = trim($v);
            }
            return;
        }
        if (is_array($v)) {
            foreach ($v as $vv) $walker($vv);
        }
    };
    $walker($data);
    return $found;
};

$signersPayload = [[
    "name" => $signerName,
    "surname" => $signerSurnameClean,
    "email" => $signerEmail,
    "phone" => $signerPhone,
    "language" => "it",
    "visuals" => $signerVisualsVettore,
]];
if ($doppiaFirma) {
    $signersPayload[] = [
        "name" => $commName,
        "surname" => $commSurnameClean,
        "email" => $commEmail,
        "phone" => $commPhone,
        "language" => "it",
        "visuals" => $signerVisualsCommittente,
    ];
}

$payload = [
    "version" => 3,
    "type" => "FES",
    "graphic" => true,
    "files" => [[
        "name" => basename($pdfFilename),
        "content" => $pdfB64,
        "signers" => $signersPayload,
    ]],
];

// Log payload "sanitizzato" (evita di scrivere in log il PDF base64 e dati sensibili completi)
$payloadLog = $payload;
if (isset($payloadLog['files'][0]['content'])) {
    $payloadLog['files'][0]['content'] = '<base64_pdf len=' . strlen((string)$payloadLog['files'][0]['content']) . '>';
}
if (isset($payloadLog['files'][0]['signers']) && is_array($payloadLog['files'][0]['signers'])) {
    foreach ($payloadLog['files'][0]['signers'] as $si => $sig) {
        if (!is_array($sig)) {
            continue;
        }
        if (isset($sig['email'])) {
            $e = (string)$sig['email'];
            $payloadLog['files'][0]['signers'][$si]['email'] = ($e === '') ? '' : (substr($e, 0, 2) . '***' . (strpos($e, '@') !== false ? substr($e, strpos($e, '@')) : ''));
        }
        if (isset($sig['phone'])) {
            $p = preg_replace('/\D+/', '', (string)$sig['phone']);
            $payloadLog['files'][0]['signers'][$si]['phone'] = ($p === '') ? '' : ('***' . substr($p, -3));
        }
    }
}
$payloadJsonForLog = json_encode($payloadLog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($payloadJsonForLog === false) {
    $log('create payload (sanitized) json_encode FAIL: ' . (string)json_last_error_msg());
} else {
    $log('create payload (sanitized): ' . $payloadJsonForLog);
}

[$ok, $err, $http, $resp] = $easygn_request('POST', $easygnBaseUrl . '/workflows/create', $bearer, json_encode($payload));
if (!$ok) {
    $log("create FAIL http=$http body=" . $preview_body($resp));
    $fail("Errore Easygn create: $err\nHTTP: $http\nRisposta: " . (string)$resp);
}
$log("create ok http=$http resp_len=" . strlen((string)$resp));

$out = json_decode((string)$resp, true);
if (!is_array($out)) $fail("Risposta Easygn non JSON: " . (string)$resp);

// Root `id` = workflow_id (Easygn). `files[].id` = documento nel workflow; `files[].signers[].id` = signer (uno o più per file).
$wfId = (string)($out['id'] ?? '');
$fileId = (string)($out['files'][0]['id'] ?? '');
$signerIds = [];
if (isset($out['files']) && is_array($out['files'])) {
    foreach ($out['files'] as $f) {
        if (!is_array($f)) {
            continue;
        }
        foreach ($f['signers'] ?? [] as $s) {
            if (!is_array($s)) {
                continue;
            }
            $sid = trim((string)($s['id'] ?? ''));
            if ($sid !== '') {
                $signerIds[] = $sid;
            }
        }
    }
}
$signerIds = array_values(array_unique($signerIds));
$signerIdsJson = json_encode($signerIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($signerIdsJson === false) {
    $signerIdsJson = '[]';
}

$link = $extract_sign_link($out);
$log("create parsed id=" . ($wfId !== '' ? $wfId : '<empty>') . " fileId=" . ($fileId !== '' ? $fileId : '<empty>') . " signerIds_n=" . count($signerIds) . " link_len=" . strlen((string)$link));
if ($link === '') {
    // Body create è tipicamente corto: log intero per capire dove sta (o se manca) il link
    $log("create response (full, no sign link extracted): " . (string)$resp);
}

if ($wfId === '') {
    $log("wfId vuoto body=" . $preview_body($resp));
    $fail("Risposta Easygn senza workflow id: " . (string)$resp);
}
$log("parsed wfId=$wfId link_len=" . strlen($link));
if ($fileId !== '') {
    $log("parsed fileId=$fileId");
}
if (count($signerIds) > 0) {
    $log("parsed signerIds=" . implode(',', $signerIds));
}

// 6) Salvataggio su DB (subito dopo create: così resta salvato anche se start fallisce)
// Richiede colonne su `contratti`, es.:
//   ALTER TABLE contratti ADD COLUMN easygn_file_id VARCHAR(64) NULL;
//   ALTER TABLE contratti ADD COLUMN easygn_signer_ids TEXT NULL; -- JSON: ["uuid",...]
$wfSql = str_replace("'", "''", $wfId);
$linkSql = ($link !== '') ? "'" . str_replace("'", "''", $link) . "'" : "NULL";
$fileIdSql = ($fileId !== '') ? "'" . str_replace("'", "''", $fileId) . "'" : "NULL";
$signerIdsSql = (count($signerIds) > 0) ? "'" . str_replace("'", "''", $signerIdsJson) . "'" : "NULL";
sc_exec_sql("UPDATE contratti SET easygn_workflow_id = '$wfSql', easygn_sign_link = $linkSql, easygn_file_id = $fileIdSql, easygn_signer_ids = $signerIdsSql WHERE id = $contrattoId");
$log("db updated");

// Endpoint start: spesso è PUT e l'id è il workflow_id
// Alcune installazioni usano /workflows/start/{id}, altre /workflows/{id}/start
[$ok2, $err2, $http2, $resp2] = $easygn_request('PUT', $easygnBaseUrl . '/workflows/start/' . rawurlencode($wfId), $bearer, '{}');
if (!$ok2 && in_array($http2, [403, 404], true)) {
    $log("start retry alt endpoint after http=$http2");
    [$ok2, $err2, $http2, $resp2] = $easygn_request('PUT', $easygnBaseUrl . '/workflows/' . rawurlencode($wfId) . '/start', $bearer, '{}');
}
if (!$ok2) {
    $log("start FAIL http=$http2 body=" . $preview_body($resp2));
    // Non bloccare: workflow id resta salvato e si può fare start manuale/da altro endpoint
} else {
    $log("start ok http=$http2 resp_len=" . strlen((string)$resp2));

    // Alcune installazioni restituiscono il link solo dopo lo start: prova a estrarlo e salvarlo se manca
    if ($link === '') {
        $out2 = json_decode((string)$resp2, true);
        if (is_array($out2)) {
            $link2 = $extract_sign_link($out2);
            if ($link2 !== '') {
                $linkSql2 = "'" . str_replace("'", "''", $link2) . "'";
                sc_exec_sql("UPDATE contratti SET easygn_sign_link = $linkSql2 WHERE id = $contrattoId");
                $log("db updated link from start (len=" . strlen($link2) . ")");
                $link = $link2;
            }
        }
        if ($link === '') {
            $log("start response (full, no sign link extracted): " . (string)$resp2);
        }
    }
}

// 7) Redirect finale (adatta al tuo flusso)
// Se vuoi rimanere sulla pagina corrente, commenta.
$log("redirect grid_contratti");
sc_redir('grid_contratti');

