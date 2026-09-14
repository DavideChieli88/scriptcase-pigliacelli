package com.supermarkethelper.presentation.scan

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.supermarkethelper.R
import com.supermarkethelper.data.scanner.BarcodeAnalyzer
import com.supermarkethelper.data.scanner.PriceOcrAnalyzer
import com.supermarkethelper.presentation.common.CameraPreview
import kotlinx.coroutines.flow.collectLatest

@Composable
fun ScanScreen(
    viewModel: ScanViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val savedMessage = stringResource(R.string.saved)
    val pendingMessage = stringResource(R.string.saved_pending)

    LaunchedEffect(Unit) {
        viewModel.events.collectLatest { event ->
            when (event) {
                is ScanEvent.Saved -> {
                    val extra = if (event.pendingOffline) " $pendingMessage" else ""
                    snackbar.showSnackbar(savedMessage + extra)
                }
                is ScanEvent.Error -> snackbar.showSnackbar(event.message)
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (state.step) {
            ScanStep.BARCODE -> BarcodeStep(
                barcode = state.barcode,
                onBarcode = viewModel::onBarcode,
                onBarcodeManual = viewModel::onBarcodeManual,
                onContinue = viewModel::goToPrice,
            )
            ScanStep.PRICE -> PriceStep(
                barcode = state.barcode,
                productName = state.productName,
                priceText = state.priceText,
                onPrice = viewModel::onPrice,
                onProductName = viewModel::onProductName,
                onBack = viewModel::goBack,
                onContinue = viewModel::goToStore,
            )
            ScanStep.STORE -> StoreStep(
                state = state,
                onStoreName = viewModel::onStoreName,
                onRetryGps = viewModel::captureLocation,
                onBypass = viewModel::toggleSaveWithoutMap,
                onBack = viewModel::goBack,
                onSave = viewModel::save,
            )
        }
        SnackbarHost(
            hostState = snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp),
        )
    }
}

@Composable
private fun BarcodeStep(
    barcode: String,
    onBarcode: (String) -> Unit,
    onBarcodeManual: (String) -> Unit,
    onContinue: () -> Unit,
) {
    val cameraGranted = rememberCameraPermission()
    var useCamera by remember { mutableStateOf(true) }
    val analyzer = remember { BarcodeAnalyzer(onBarcode) }
    DisposableEffect(analyzer) {
        onDispose { analyzer.close() }
    }
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Inquadra il codice a barre", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        if (cameraGranted && useCamera) {
            CameraPreview(
                analyzer = analyzer,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp),
            )
        } else {
            Text("Fotocamera non disponibile. Inserisci il codice a mano.")
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = barcode,
            onValueChange = onBarcodeManual,
            label = { Text("Codice a barre (EAN)") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = { useCamera = !useCamera }) {
            Text(if (useCamera) "Inserisci manualmente" else "Usa la fotocamera")
        }
        Button(
            onClick = onContinue,
            enabled = barcode.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Continua")
        }
    }
}

@Composable
private fun PriceStep(
    barcode: String,
    productName: String,
    priceText: String,
    onPrice: (String) -> Unit,
    onProductName: (String) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    val cameraGranted = rememberCameraPermission()
    val analyzer = remember { PriceOcrAnalyzer(onPrice) }
    DisposableEffect(analyzer) {
        onDispose { analyzer.close() }
    }
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Inquadra il prezzo", style = MaterialTheme.typography.titleLarge)
        Text("EAN $barcode", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))
        if (cameraGranted) {
            CameraPreview(
                analyzer = analyzer,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp),
            )
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = priceText,
            onValueChange = onPrice,
            label = { Text("Prezzo in euro") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = productName,
            onValueChange = onProductName,
            label = { Text("Nome prodotto (da OCR o a mano)") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Indietro") }
        Button(
            onClick = onContinue,
            enabled = priceText.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Continua") }
    }
}

@Composable
private fun StoreStep(
    state: ScanUiState,
    onStoreName: (String) -> Unit,
    onRetryGps: () -> Unit,
    onBypass: (Boolean) -> Unit,
    onBack: () -> Unit,
    onSave: () -> Unit,
) {
    val locationGranted = rememberLocationPermission(onGranted = onRetryGps)
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Negozio e posizione", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = state.storeName,
            onValueChange = onStoreName,
            label = { Text("Nome supermercato") },
            modifier = Modifier.fillMaxWidth(),
        )
        val gpsText = when {
            state.locating -> "Acquisizione GPS..."
            state.location != null -> {
                val acc = state.location.accuracyMeters?.let { " (±${it.toInt()}m)" } ?: ""
                "Posizione acquisita$acc"
            }
            else -> "GPS debole, riprova"
        }
        Text(gpsText, style = MaterialTheme.typography.bodyMedium)
        if (!locationGranted) {
            Text("Serve il permesso posizione per associare il prezzo al negozio.")
        }
        OutlinedButton(onClick = onRetryGps, enabled = locationGranted && !state.locating) {
            Text("Riprova GPS")
        }
        FilterChip(
            selected = state.saveWithoutMap,
            onClick = { onBypass(!state.saveWithoutMap) },
            label = { Text("Salva senza mappa") },
        )
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Indietro") }
        Button(
            onClick = onSave,
            enabled = !state.saving,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.saving) "Salvataggio..." else "Salva")
        }
        Text(
            "Il salvataggio funziona anche senza rete. Lo stato restera In attesa fino alla sincronizzazione.",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun rememberCameraPermission(): Boolean {
    val context = LocalContext.current
    var granted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        granted = it
    }
    LaunchedEffect(Unit) {
        if (!granted) launcher.launch(Manifest.permission.CAMERA)
    }
    return granted
}

@Composable
private fun rememberLocationPermission(onGranted: () -> Unit): Boolean {
    val context = LocalContext.current
    var granted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        granted = result.values.any { it }
        if (granted) onGranted()
    }
    LaunchedEffect(Unit) {
        if (!granted) {
            launcher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        } else {
            onGranted()
        }
    }
    return granted
}

