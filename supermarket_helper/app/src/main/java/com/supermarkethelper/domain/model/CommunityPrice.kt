package com.supermarkethelper.domain.model

data class CommunityPrice(
    val id: String,
    val barcode: String,
    val productName: String,
    val price: Double,
    val storeName: String,
    val geohash: String,
    val scannedAt: Long,
    val confirmedCount: Int = 1,
)