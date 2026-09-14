package com.supermarkethelper.presentation.privacy

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PrivacyScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("Informativa privacy (stub)", style = MaterialTheme.typography.titleLarge)
        Text(
            """
            Supermarket Helper raccoglie solo i dati necessari al crowdsourcing dei prezzi:
            codice a barre, prezzo, nome negozio e coordinate GPS al momento della scansione.

            I dati restano sul telefono (Room, in chiaro) fino alla sincronizzazione.
            Quando sei online, i report vanno su Firestore con un identificativo anonimo (Firebase Anonymous Auth).
            Non usiamo account Google nella v1.

            La posizione serve a collocare il supermercato, non a tracciare gli spostamenti.
            Non c'e ascolto GPS continuo: viene usata l'ultima posizione nota oppure un singolo fix a basso consumo.

            Puoi usare l'app in assenza di rete. La sincronizzazione parte da sola quando torna la connessione.

            Questo testo e uno stub per Play Store / GDPR: va sostituito con l'informativa legale definitiva prima della pubblicazione.
            """.trimIndent(),
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 12.dp),
        )
    }
}