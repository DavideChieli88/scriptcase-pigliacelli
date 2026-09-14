package com.supermarkethelper.presentation.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.supermarkethelper.domain.usecase.ObserveMyPricesUseCase
import com.supermarkethelper.domain.usecase.RetryFailedSyncUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    observeMyPrices: ObserveMyPricesUseCase,
    private val retryFailedSync: RetryFailedSyncUseCase,
) : ViewModel() {
    val prices = observeMyPrices()

    fun retry(id: String) {
        viewModelScope.launch { retryFailedSync(id) }
    }
}