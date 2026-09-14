package com.supermarkethelper.presentation.lookup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun LookupScreen(
    viewModel: LookupViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()
    val currency = androidx.compose.runtime.remember { NumberFormat.getCurrencyInstance(Locale.ITALY) }
    val date = androidx.compose.runtime.remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.ITALY) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Prezzi della community", style = MaterialTheme.typography.titleLarge)
        Text(
            "La ricerca usa Firestore e richiede rete. I tuoi salvataggi locali restano la fonte di verita sul telefono.",
            style = MaterialTheme.typography.bodySmall,
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.barcode,
            onValueChange = viewModel::onBarcode,
            label = { Text("Codice a barre") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = viewModel::search,
            enabled = !state.loading && state.barcode.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Cerca") }
        if (!isOnline) {
            Text(
                "Sei offline: la community non e consultabile. Puoi comunque scansionare e salvare in locale.",
                modifier = Modifier.padding(top = 12.dp),
            )
        }
        if (state.loading) {
            CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
        }
        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp)) }
        if (state.searched && !state.loading && state.results.isEmpty() && state.error == null) {
            Text("Nessun prezzo trovato per questo codice.", modifier = Modifier.padding(top = 12.dp))
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            items(state.results, key = { it.id }) { item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(item.storeName.ifBlank { "Negozio" }, style = MaterialTheme.typography.titleMedium)
                        Text(currency.format(item.price), style = MaterialTheme.typography.titleLarge)
                        Text(date.format(Date(item.scannedAt)), style = MaterialTheme.typography.bodySmall)
                        if (item.confirmedCount > 1) {
                            Text("Confermato ${item.confirmedCount} volte")
                        }
                    }
                }
            }
        }
    }
}