package com.supermarkethelper.domain.model

data class GeoFix(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
    val timestampMillis: Long,
)