package com.supermarkethelper.domain.model

data class ScanDraft(
    val barcode: String = "",
    val productName: String = "",
    val priceText: String = "",
    val storeName: String = "",
    val location: GeoFix? = null,
    val saveWithoutMap: Boolean = false,
    val scannedAt: Long = System.currentTimeMillis(),
)