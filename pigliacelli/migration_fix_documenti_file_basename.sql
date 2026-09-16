-- Allinea basename in DB (file gia' in _lib/file/doc/, senza subdir documenti/).
-- Dopo ridistribuzione: Apri/Firma riscrive i PDF in doc/ e aggiorna DB.

UPDATE documenti SET file = 'dichiarazioni_210_Test_subvettore_new_2026-09-15.pdf', updated_at = NOW()
WHERE id = 2153;

UPDATE documenti SET file = 'docverde_2154_Informativa_Privacy_2026-09-15.pdf', updated_at = NOW()
WHERE id = 2154;

UPDATE documenti SET file = 'docverde_2155_Manuale_del_vettore_2026-09-15.pdf', updated_at = NOW()
WHERE id = 2155;

UPDATE documenti SET file = 'docverde_2156_Codice_Etico_e_Parte_generale_Mod_231_2026-09-15.pdf', updated_at = NOW()
WHERE id = 2156;
