package com.supermarkethelper.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.supermarkethelper.data.local.PriceDao
import com.supermarkethelper.data.remote.PriceRemoteDataSource
import com.supermarkethelper.domain.model.SyncStatus
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncPricesWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val priceDao: PriceDao,
    private val remote: PriceRemoteDataSource,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        if (priceDao.countByStatus(SyncStatus.PENDING) == 0) {
            return Result.success()
        }
        return try {
            remote.ensureSignedIn()
            var batches = 0
            while (batches < SyncConstraints.MAX_BATCHES_PER_RUN) {
                val pending = priceDao.getByStatus(SyncStatus.PENDING, SyncConstraints.BATCH_SIZE)
                if (pending.isEmpty()) break
                val ids = pending.map { it.id }
                try {
                    remote.uploadBatch(pending)
                    priceDao.markSynced(ids, SyncStatus.SYNCED, System.currentTimeMillis())
                } catch (error: Throwable) {
                    if (remote.isPermanent(error)) {
                        priceDao.markFailed(ids, SyncStatus.FAILED, error.message?.take(180) ?: "Errore sync")
                    } else {
                        priceDao.incrementRetry(ids)
                        return Result.retry()
                    }
                }
                batches++
            }
            if (priceDao.countByStatus(SyncStatus.PENDING) > 0) {
                Result.retry()
            } else {
                Result.success()
            }
        } catch (error: Throwable) {
            if (remote.isPermanent(error)) {
                Result.success()
            } else {
                Result.retry()
            }
        }
    }
}