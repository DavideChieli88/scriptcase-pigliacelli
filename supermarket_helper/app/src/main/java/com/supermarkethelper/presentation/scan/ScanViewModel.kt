package com.supermarkethelper.presentation.scan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.supermarkethelper.data.connectivity.ConnectivityObserver
import com.supermarkethelper.data.location.LocationDataSource
import com.supermarkethelper.domain.model.GeoFix
import com.supermarkethelper.domain.model.ScanDraft
import com.supermarkethelper.domain.repo.PriceRepository
import com.supermarkethelper.domain.usecase.SaveScanUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ScanStep { BARCODE, PRICE, STORE }

data class ScanUiState(
    val step: ScanStep = ScanStep.BARCODE,
    val barcode: String = "",
    val productName: String = "",
    val priceText: String = "",
    val storeName: String = "",
    val location: GeoFix? = null,
    val locating: Boolean = false,
    val saveWithoutMap: Boolean = false,
    val saving: Boolean = false,
    val scannedAt: Long = System.currentTimeMillis(),
)

sealed interface ScanEvent {
    data class Saved(val pendingOffline: Boolean) : ScanEvent
    data class Error(val message: String) : ScanEvent
}

@HiltViewModel
class ScanViewModel @Inject constructor(
    private val saveScan: SaveScanUseCase,
    private val repository: PriceRepository,
    private val locationDataSource: LocationDataSource,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {

    private val _state = MutableStateFlow(ScanUiState())
    val state: StateFlow<ScanUiState> = _state.asStateFlow()

    val isOnline: StateFlow<Boolean> = connectivityObserver.isOnline

    private val _events = MutableSharedFlow<ScanEvent>()
    val events: SharedFlow<ScanEvent> = _events.asSharedFlow()

    init {
        viewModelScope.launch {
            val lastStore = repository.lastStoreName()
            if (!lastStore.isNullOrBlank()) {
                _state.update { it.copy(storeName = lastStore) }
            }
        }
    }

    fun onBarcode(value: String) {
        _state.update {
            it.copy(
                barcode = value,
                step = ScanStep.PRICE,
                scannedAt = System.currentTimeMillis(),
            )
        }
    }

    fun onPrice(value: String) {
        _state.update { it.copy(priceText = value) }
    }

    fun onProductName(value: String) {
        _state.update { it.copy(productName = value) }
    }

    fun onStoreName(value: String) {
        _state.update { it.copy(storeName = value) }
    }

    fun onBarcodeManual(value: String) {
        _state.update { it.copy(barcode = value) }
    }

    fun goToPrice() {
        if (_state.value.barcode.isNotBlank()) {
            _state.update { it.copy(step = ScanStep.PRICE, scannedAt = System.currentTimeMillis()) }
        }
    }

    fun goToStore() {
        _state.update { it.copy(step = ScanStep.STORE) }
        captureLocation()
    }

    fun goBack() {
        _state.update {
            when (it.step) {
                ScanStep.BARCODE -> it
                ScanStep.PRICE -> it.copy(step = ScanStep.BARCODE)
                ScanStep.STORE -> it.copy(step = ScanStep.PRICE)
            }
        }
    }

    fun captureLocation() {
        viewModelScope.launch {
            _state.update { it.copy(locating = true) }
            val fix = locationDataSource.capture()
            _state.update { it.copy(location = fix, locating = false) }
        }
    }

    fun toggleSaveWithoutMap(enabled: Boolean) {
        _state.update { it.copy(saveWithoutMap = enabled) }
    }

    fun save() {
        val current = _state.value
        if (current.saving) return
        viewModelScope.launch {
            _state.update { it.copy(saving = true) }
            val result = saveScan(
                ScanDraft(
                    barcode = current.barcode,
                    productName = current.productName,
                    priceText = current.priceText,
                    storeName = current.storeName,
                    location = current.location,
                    saveWithoutMap = current.saveWithoutMap,
                    scannedAt = current.scannedAt,
                ),
            )
            _state.update { it.copy(saving = false) }
            result.onSuccess {
                val keepStore = current.storeName
                _state.value = ScanUiState(storeName = keepStore)
                _events.emit(ScanEvent.Saved(pendingOffline = !isOnline.value))
            }.onFailure { error ->
                _events.emit(ScanEvent.Error(error.message ?: "Impossibile salvare"))
            }
        }
    }
}