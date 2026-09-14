package com.supermarkethelper.domain.repo

import com.supermarkethelper.domain.model.CommunityPrice
import com.supermarkethelper.domain.model.Price
import kotlinx.coroutines.flow.Flow

interface PriceRepository {
    fun observeMine(): Flow<List<Price>>
    suspend fun save(price: Price)
    suspend fun lastStoreName(): String?
    suspend fun retry(id: String)
    suspend fun lookupCommunity(barcode: String, geohash: String?): Result<List<CommunityPrice>>
}