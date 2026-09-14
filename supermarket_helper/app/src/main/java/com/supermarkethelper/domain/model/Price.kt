package com.supermarkethelper.domain.model

data class Price(
    val id: String,
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