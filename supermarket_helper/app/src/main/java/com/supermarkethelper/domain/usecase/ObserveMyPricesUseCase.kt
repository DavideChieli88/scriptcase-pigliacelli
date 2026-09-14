package com.supermarkethelper.domain.usecase

import com.supermarkethelper.domain.repo.PriceRepository
import javax.inject.Inject

class ObserveMyPricesUseCase @Inject constructor(
    private val repository: PriceRepository,
) {
    operator fun invoke() = repository.observeMine()
}