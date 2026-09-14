package com.supermarkethelper.data.repo

import com.supermarkethelper.data.local.PriceDao
import com.supermarkethelper.data.local.toDomain
import com.supermarkethelper.data.local.toEntity
import com.supermarkethelper.data.remote.PriceRemoteDataSource
import com.supermarkethelper.data.remote.dedupeVisually
import com.supermarkethelper.data.remote.nearbyHashes
import com.supermarkethelper.data.sync.SyncScheduler
import com.supermarkethelper.domain.model.CommunityPrice
import com.supermarkethelper.domain.model.Price
import com.supermarkethelper.domain.model.SyncStatus
import com.supermarkethelper.domain.repo.PriceRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PriceRepositoryImpl @Inject constructor(
    private val dao: PriceDao,
    private val remote: PriceRemoteDataSource,
    private val syncScheduler: SyncScheduler,
) : PriceRepository {

    override fun observeMine(): Flow<List<Price>> = dao.observeAll().map { list ->
        list.map { it.toDomain() }
    }

    override suspend fun save(price: Price) {
        dao.insert(price.toEntity())
        syncScheduler.enqueue()
    }

    override suspend fun lastStoreName(): String? = dao.lastStoreName()

    override suspend fun retry(id: String) {
        dao.updateStatus(id, SyncStatus.PENDING)
        syncScheduler.enqueue()
    }

    override suspend fun lookupCommunity(barcode: String, geohash: String?): Result<List<CommunityPrice>> {
        return runCatching {
            val neighbors = nearbyHashes(geohash)
            val reports = remote.lookup(barcode)
            val filtered = if (neighbors.isEmpty()) {
                reports
            } else {
                reports.filter { it.geohash.isBlank() || it.geohash in neighbors }
            }
            filtered.dedupeVisually()
        }
    }
}