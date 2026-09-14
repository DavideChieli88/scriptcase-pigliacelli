package com.supermarkethelper.domain.usecase

import com.supermarkethelper.domain.model.CommunityPrice
import com.supermarkethelper.domain.repo.PriceRepository
import javax.inject.Inject

class LookupCommunityPricesUseCase @Inject constructor(
    private val repository: PriceRepository,
) {
    suspend operator fun invoke(barcode: String, geohash: String?): Result<List<CommunityPrice>> {
        return repository.lookupCommunity(barcode.trim(), geohash)
    }
}