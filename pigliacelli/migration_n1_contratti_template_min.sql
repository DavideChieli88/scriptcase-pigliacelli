-- ============================================================
-- Pigliacelli — migration MINIMA N1 step "editor template standard"
-- DB: pigliacelli
--
-- Solo la tabella master dei template HTML (tipo 1).
-- NON include ancora colonne su `contratti` (template_id /
-- html_body_snapshot): servono allo step successivo (edit pre-invio
-- sul singolo contratto + PDF).
--
-- sign_boxes_json su contratti/documenti = pezzo editor firme (gia' a parte).
--
-- CHECK:
--   SHOW TABLES LIKE 'contratti_template';
--   SHOW COLUMNS FROM contratti_template;
-- ============================================================

CREATE TABLE IF NOT EXISTS `contratti_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `html_body` LONGTEXT NOT NULL
    COMMENT 'Corpo HTML editabile (placeholder {{campo}})',
  `attivo` TINYINT(1) NOT NULL DEFAULT 1,
  `note` TEXT NULL DEFAULT NULL
    COMMENT 'Nota interna ops (opzionale)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contratti_template_attivo` (`attivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Template master contratto tipo 1 (N1)';

-- Seed iniziale (salta se esiste gia' un template con stesso nome)
INSERT INTO `contratti_template` (`nome`, `html_body`, `attivo`, `note`)
SELECT
  'Contratto quadro standard',
  CONCAT(
    '<h1 style="text-align:center;">CONTRATTO DI TRASPORTO DI MERCI SU STRADA N. {{contratto_numero}}/{{anno}}</h1>',
    '<p style="text-align:center;"><strong>Tra</strong></p>',
    '<p><strong>Il Committente</strong><br>',
    'Autotrasporti Pigliacelli S.p.A. con sede a Veroli (FR) in via Sant&rsquo;Anna n. 80, ',
    'Partita Iva, Codice Fiscale e n. di iscrizione al Registro delle Imprese di Frosinone 00169560604, ',
    'R.E.A. 59333, in persona del Consigliere Delegato sig. Marcello Pigliacelli ',
    '(di seguito Committente).</p>',
    '<p><strong>Il Vettore</strong><br>',
    '{{vettore_ragione_sociale}} con sede a {{vettore_citta}} ({{vettore_provincia}}), ',
    'Via {{vettore_indirizzo}} n. {{vettore_civico}}, Codice Fiscale {{vettore_cf}}, ',
    'P. Iva {{vettore_piva}}, R.E.A. {{vettore_rea}}, ',
    'iscritta all&rsquo;Albo Nazionale degli Autotrasportatori al n. {{vettore_albo}}, ',
    'in persona del Legale rappresentante sig. {{rapp_nome}} {{rapp_cognome}}, ',
    'nato a {{rapp_luogo_nascita}} ({{rapp_prov_nascita}}) il {{rapp_data_nascita}} ',
    '(di seguito Vettore).</p>',
    '<p>si conviene e stipula quanto segue:</p>',
    '<p><strong>Art. 1) IDENTIFICAZIONE DELLE PARTI E OGGETTO DEL CONTRATTO</strong><br>',
    'Il Proprietario Merci: vedi (Allegato A)<br>',
    'Il Caricatore Delle Merci: vedi (Allegato A)<br>',
    'Oggetto del presente Contratto sono i servizi di trasporto che il Vettore eseguir&agrave; ',
    'su ordine del Committente in conformit&agrave; a quanto pattuito nel presente Contratto.</p>',
    '<p><em>Modificare liberamente questo HTML nel form Template. ',
    'I placeholder {{...}} verranno sostituiti in generazione PDF.</em></p>',
    '<p>Data certa: {{data_certa}}</p>'
  ),
  1,
  'Seed N1 — sostituire/ampliare con testo legale completo'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `contratti_template`
  WHERE `nome` = 'Contratto quadro standard'
  LIMIT 1
);
