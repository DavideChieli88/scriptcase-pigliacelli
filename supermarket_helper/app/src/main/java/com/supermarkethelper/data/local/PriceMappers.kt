package com.supermarkethelper.data.local

import com.supermarkethelper.domain.model.Price

fun PriceEntity.toDomain(): Price = Price(
    id = id,
    barcode = barcode,
    productName = productName,
    price = price,
    currency = currency,
    storeName = storeName,
    latitude = latitude,
    longitude = longitude,
    accuracyMeters = accuracyMeters,
    geohash = geohash,
    scannedAt = scannedAt,
    capturedAt = capturedAt,
    syncStatus = syncStatus,
    syncRetryCount = syncRetryCount,
    lastSyncError = lastSyncError,
    lastSyncedAt = lastSyncedAt,
    schemaVersion = schemaVersion,
)

fun Price.toEntity(): PriceEntity = PriceEntity(
    id = id,
    barcode = barcode,
    productName = productName,
    price = price,
    currency = currency,
    storeName = storeName,
    latitude = latitude,
    longitude = longitude,
    accuracyMeters = accuracyMeters,
    geohash = geohash,
    scannedAt = scannedAt,
    capturedAt = capturedAt,
    syncStatus = syncStatus,
    syncRetryCount = syncRetryCount,
    lastSyncError = lastSyncError,
    lastSyncedAt = lastSyncedAt,
    schemaVersion = schemaVersion,
)