package com.supermarkethelper.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.supermarkethelper.domain.model.SyncStatus

@Entity(
    tableName = "prices",
    indices = [
        Index(value = ["syncStatus"]),
        Index(value = ["barcode"]),
        Index(value = ["scannedAt"]),
    ],
)
data class PriceEntity(
    @PrimaryKey val id: String,
    val barcode: String,
    val productName: String?,
    val price: Double,
    val currency: String,
    val storeName: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
    val geohash: String,
    val scannedAt: Long,
    val capturedAt: Long,
    val syncStatus: SyncStatus,
    val syncRetryCount: Int,
    val lastSyncError: String?,
    val lastSyncedAt: Long?,
    val schemaVersion: Int,
)