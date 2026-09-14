package com.supermarkethelper.domain.usecase

import com.supermarkethelper.domain.repo.PriceRepository
import javax.inject.Inject

class RetryFailedSyncUseCase @Inject constructor(
    private val repository: PriceRepository,
) {
    suspend operator fun invoke(id: String) = repository.retry(id)
}