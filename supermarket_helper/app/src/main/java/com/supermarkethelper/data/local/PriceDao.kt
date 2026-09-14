package com.supermarkethelper.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.supermarkethelper.domain.model.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface PriceDao {
    @Query("SELECT * FROM prices ORDER BY scannedAt DESC")
    fun observeAll(): Flow<List<PriceEntity>>

    @Query("SELECT COUNT(*) FROM prices WHERE syncStatus = :status")
    suspend fun countByStatus(status: SyncStatus): Int

    @Query("SELECT * FROM prices WHERE syncStatus = :status ORDER BY scannedAt ASC LIMIT :limit")
    suspend fun getByStatus(status: SyncStatus, limit: Int): List<PriceEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: PriceEntity)

    @Query(
        "UPDATE prices SET syncStatus = :status, lastSyncedAt = :syncedAt, lastSyncError = NULL WHERE id IN (:ids)",
    )
    suspend fun markSynced(ids: List<String>, status: SyncStatus, syncedAt: Long)

    @Query(
        "UPDATE prices SET syncStatus = :status, lastSyncError = :error, syncRetryCount = syncRetryCount + 1 WHERE id IN (:ids)",
    )
    suspend fun markFailed(ids: List<String>, status: SyncStatus, error: String)

    @Query("UPDATE prices SET syncRetryCount = syncRetryCount + 1 WHERE id IN (:ids)")
    suspend fun incrementRetry(ids: List<String>)

    @Query("UPDATE prices SET syncStatus = :status, lastSyncError = NULL WHERE id = :id")
    suspend fun updateStatus(id: String, status: SyncStatus)

    @Query("SELECT storeName FROM prices WHERE storeName != '' ORDER BY scannedAt DESC LIMIT 1")
    suspend fun lastStoreName(): String?
}