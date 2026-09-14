package com.supermarkethelper.presentation.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.supermarkethelper.domain.model.Price
import com.supermarkethelper.presentation.common.SyncStatusChip
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun HistoryScreen(
    onPrivacy: () -> Unit,
    viewModel: HistoryViewModel = hiltViewModel(),
) {
    val prices by viewModel.prices.collectAsStateWithLifecycle(initialValue = emptyList())
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("I miei prezzi", style = MaterialTheme.typography.titleLarge)
            androidx.compose.material3.TextButton(onClick = onPrivacy) {
                Text("Informativa")
            }
        }
        if (prices.isEmpty()) {
            Text(
                "Nessun prezzo salvato. Scansiona un prodotto anche senza rete.",
                modifier = Modifier.padding(top = 24.dp),
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                items(prices, key = { it.id }) { price ->
                    PriceRow(price = price, onRetry = { viewModel.retry(price.id) })
                }
            }
        }
    }
}

@Composable
private fun PriceRow(price: Price, onRetry: () -> Unit) {
    val currency = rememberCurrency()
    val date = rememberDate()
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(price.productName ?: price.barcode, style = MaterialTheme.typography.titleMedium)
            Text("${price.storeName}  ·  ${currency.format(price.price)}")
            Text("EAN ${price.barcode}  ·  ${date.format(Date(price.scannedAt))}", style = MaterialTheme.typography.bodySmall)
            SyncStatusChip(status = price.syncStatus, onRetry = onRetry)
            if (price.syncStatus == com.supermarkethelper.domain.model.SyncStatus.FAILED && price.lastSyncError != null) {
                Text(price.lastSyncError, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun rememberCurrency(): NumberFormat {
    return androidx.compose.runtime.remember {
        NumberFormat.getCurrencyInstance(Locale.ITALY)
    }
}

@Composable
private fun rememberDate(): SimpleDateFormat {
    return androidx.compose.runtime.remember {
        SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.ITALY)
    }
}