-- Una tantum, prima del job T0.
-- legacy = 1: tratta importata dallo storico 2024-oggi, gia coperta da contratto cartaceo.
-- Il default 0 vale per le tratte del job incrementale.

ALTER TABLE tratte
  ADD COLUMN legacy TINYINT NOT NULL DEFAULT 0;
