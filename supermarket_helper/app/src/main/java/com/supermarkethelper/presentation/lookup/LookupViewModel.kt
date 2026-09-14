package com.supermarkethelper.presentation.lookup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.supermarkethelper.data.connectivity.ConnectivityObserver
import com.supermarkethelper.data.location.LocationDataSource
import com.supermarkethelper.domain.GeoHash
import com.supermarkethelper.domain.model.CommunityPrice
import com.supermarkethelper.domain.usecase.LookupCommunityPricesUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LookupUiState(
    val barcode: String = "",
    val loading: Boolean = false,
    val results: List<CommunityPrice> = emptyList(),
    val error: String? = null,
    val searched: Boolean = false,
)

@HiltViewModel
class LookupViewModel @Inject constructor(
    private val lookup: LookupCommunityPricesUseCase,
    private val locationDataSource: LocationDataSource,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {
    val isOnline = connectivityObserver.isOnline

    private val _state = MutableStateFlow(LookupUiState())
    val state: StateFlow<LookupUiState> = _state.asStateFlow()

    fun onBarcode(value: String) {
        _state.update { it.copy(barcode = value) }
    }

    fun search() {
        val barcode = _state.value.barcode.trim()
        if (barcode.isBlank()) return
        if (!isOnline.value) {
            _state.update {
                it.copy(
                    searched = true,
                    results = emptyList(),
                    error = "Serve connessione per i prezzi della community.",
                    loading = false,
                )
            }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null, searched = true) }
            val geohash = locationDataSource.capture()?.let { GeoHash.encode(it.latitude, it.longitude) }
            val result = lookup(barcode, geohash)
            _state.update {
                result.fold(
                    onSuccess = { prices -> it.copy(loading = false, results = prices, error = null) },
                    onFailure = { error ->
                        it.copy(
                            loading = false,
                            results = emptyList(),
                            error = error.message ?: "Ricerca non disponibile",
                        )
                    },
                )
            }
        }
    }
}