# Briefing e allineamento — 17 novembre 2026

**Fonte:** appunti Gemini della call *Pigliacelli Workspace | Briefing e allineamento* (17/11/2026, 11:30 CET)  
**Partecipanti:** Davide Chieli, Erik Capoccetta (Digiweb)  
**File originale:** `pigliacelli_briefing_sal_2026-11-17.docx` · trascrizione `pigliacelli_briefing_sal_2026-11-17.txt`

Vedi anche: [`attivita_modulo_2_2026-11-11.md`](attivita_modulo_2_2026-11-11.md) · [`mail_cliente_osservazioni_2026-11-06.md`](mail_cliente_osservazioni_2026-11-06.md) · [`LLM_WIKI.md`](LLM_WIKI.md)

Call di allineamento su mail Marcoccia (06/11), bugfix griglie/sync e **due NEW** (documenti PGL→subv + template contratto HTML). Scadenza indicativa nuove: **metà dicembre** (≈17–21/12).

---

## Riepilogo call

- **Doppio invio:** Marcoccia aveva chiesto di eliminarlo; dopo spiegazione di Erik **resta** (controllo del flusso). Sulle appendici Davide aveva semplificato verso firma diretta: in call si può lasciare così (“ottimizzazione”), senza forzare un ripristino immediato.
- **Marcello / Flavia / appendici / link auto:** punti mail 06/11 in gran parte **già fatti** (notifiche scadenze fuori da group 5; Appendice#N al contratto#Q; mail auto + sollecito a Marcello). Firma Flavia: dare **ruolo/permessi committente** (es. 1+C o group 5); il nominativo legale resta quello in ADB/settings.
- **Griglie:** non “tutte rotte”; QA richiesta su **ricerca rapida + filtri avanzati** (operatori coerenti col tipo campo; togliere **Id** dove non serve). Anomalia **case-insensitive** emersa soprattutto in **Documentazione** (minuscolo non trova “Carmine Salerno”) → da indagare (impostazioni SC / collation).
- **Sync tratte SGA:** già velocizzata (es. ~32 tratte in ~2s) + **lock** UI e DB anti-parallelismo → smarcabile lato bugfix prestazioni.
- **NEW documenti:** Documentazione in **due sottosezioni** — (A) doc caricati dal subvettore; (B) doc caricati da **Pigliacelli** da far **visionare** (presa visione) o **firmare** (PDF + posizionamento riquadri firma stile Collab).
- **NEW template contratto:** editor **HTML** (campo HTML Editor SC / TinyMCE-like), sezione **Template**, placeholder `{{campo}}`, anteprima/modifica **per singolo invio** senza alterare il master, poi **posizionamento firme ogni volta** prima dell’invio. Scope esplicito: **contratto** (non privacy/231). Tipo 1 da ripensare come HTML→PDF; variazione tipo 2/3 resta soprattutto tabella.
- **AI in ScriptCase:** Erik consiglia modello **Opus (Anthropic)** integrato in SC per accelerare lo sviluppo.
- Erik condivide codice di riferimento Collab (posizionamento firme / flusso PDF).

---

## Decisioni

| # | Decisione |
|---|-----------|
| D1 | **Mantenere il doppio invio** nel flusso (non eliminarlo come da mail 06/11 §4) |
| D2 | Denominazione appendici: **Appendice #N al contratto #Q** (uniforme mail/PDF/testo) — già implementata |
| D3 | Committente: **solo notifiche firma**; reinvio link sollecito ok — già implementato |
| D4 | Flavia: abilitare firma con **permessi ruolo committente**; nome legale invariato (ADB/settings) |
| D5 | QA completa griglie: ricerca rapida + filtri avanzati coerenti; rimuovere Id superfluo; fix case-insensitive dove manca |
| D6 | Sync tratte: soluzione attuale (veloce + lock) accettata |
| D7 | Nuova sottosezione Documentazione: PDF da PGL con flag **presa visione** \| **firma** (+ UI riquadri se firma) |
| D8 | Template contratto: editor HTML + sezione template + edit pre-invio + firme dinamiche post-modifica |
| D9 | Target consegna NEW (+ fix residui): **metà dicembre 2026** |
| D10 | Editor HTML solo per **contratti**, non altri documenti aziendali (privacy/231) salvo nuove richieste |

---

## Action items

| Chi | Cosa | Quando |
|-----|------|--------|
| Davide | QA tutte le griglie (rapida + avanzata); operatori coerenti; togliere Id dove inutile | ASAP |
| Davide | Investigare case-insensitive ricerca (Documentazione e altre) | ASAP |
| Davide | NEW: sottosezione documenti PGL→subv (visione/firma + box firma) | entro metà dic |
| Davide | NEW: sezione Template + editor HTML + edit pre-invio + PoC SC/TCPDF | entro metà dic |
| Davide | Posizionamento dinamico firme su ogni invio contratto (e doc da firmare) | con NEW template/doc |
| Davide | (Opzionale) Provare Opus Anthropic in ScriptCase | continuo |
| Erik | Condividere codice Collab (editor / riquadri firma) | ASAP |
| Erik | Comunicare a cliente bugfix sync/griglie “risolti / in chiusura” e piano NEW a metà dic | dopo QA griglie |

---

## Impatto tecnico (repo) — bozza

### Bugfix / già in corso
- Sync: `check_new_trips_fast` (query a gruppi, lock job/menu).
- Appendici/label/mail: report `variazione_contratto`, `send_magic_link*`, `web_hook_firma`, reinvio committente.
- Griglie: impostazioni ScriptCase (fast search case, filtri campo, hide Id) più che codice PHP eventi.

### NEW — Documenti PGL → subvettore
- Nuova area sotto Documentazione (o app dedicate): upload PDF admin, titolo, scelta **visione** / **firma**.
- Visione: apertura + flag/timestamp presa visione lato subv.
- Firma: wizard “posiziona riquadri” su anteprima PDF (coordinate → EasyGN), riferimento UX **Collab**.
- Distinto dai documenti “caricati dal subvettore” (flusso attuale / wizard).

### NEW — Template contratto HTML
- Tabella/sezione **template** (HTML body; eventuale header/footer o corpo unico).
- Placeholder `{{...}}` sostituiti pre-TCPDF / pre-PDF.
- Flusso invio: scegli template → HTML già fillato → edit opzionale per quel contratto → anteprima → **posiziona firme** → invio.
- Impatto alto su `nuovo_contratto_vettore` / finalize / EasyGN (report SC attuale probabilmente da dismettere o affiancare).
- Tipo 2/3: in call trattati come tabella; non necessariamente stesso editor full-text.

---

## Stato vs mail 06/11 e attività 11/11

| Tema | Mail 06/11 / Attività 11/11 | Esito call 17/11 |
|------|-----------------------------|------------------|
| Marcello no scadenze doc | B8 | Fatto |
| Firma Marcello + Flavia | §2 | Flavia = permessi committente |
| N° contratto in appendice | B6 | Fatto (Appendice N / contratto Q) |
| Eliminare doppio invio | §4 | **Rivisto: mantenere doppio invio** |
| Label Appendice#N | B7 | Fatto |
| Link auto + sollecito Marcello | B4 | Fatto |
| Sync tratte | B2 | Fatto (fast + lock) |
| Ricerca griglie | B3 | Parziale; resta QA case/filtri/Id |
| Grid dettaglio subv | B5 | Dichiarato già fatto in call |
| Template contratto | N1 | Scope dettagliato (HTML + pre-invio + firme) |
| Doc PGL da visionare/firmare | N2 | Scope dettagliato (2 sottosezioni + box firma) |

---

## Note accuratezza Gemini

Gli appunti Gemini riassumono bene decisioni e NEXT; la trascrizione chiarisce sfumature importanti:
- doppio invio **ripristinato come requisito di processo**, non “già eliminato ovunque”;
- sulle appendici la firma diretta può restare;
- case search: bug osservato live su Documentazione, non “tutte le grid morte”;
- deadline metà dicembre sulle **due NEW**, non su tutto lo storico Modulo 2 già chiuso.
