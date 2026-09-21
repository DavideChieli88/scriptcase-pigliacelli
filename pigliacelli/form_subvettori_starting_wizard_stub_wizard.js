/**
 * Residuo wizard multi-step Scriptcase su form SINGOLA.
 *
 * scJQWizardGoToStep parte al document.ready e chiama displayChange_page,
 * che esisteva quando la form era wizard. Ora manca → ReferenceError.
 *
 * DOVE INCOLLARE (globale, NON JavaScript Method):
 *   form_subvettori_starting_wizard → Layout → JavaScript
 * (o Programming → JavaScript dell'applicazione, se presente)
 *
 * Deve essere globale e caricato PRIMA del $(document).ready di SC.
 * Dentro mlReviewHideSaveInit può arrivare troppo tardi.
 */

function displayChange_page() {}
