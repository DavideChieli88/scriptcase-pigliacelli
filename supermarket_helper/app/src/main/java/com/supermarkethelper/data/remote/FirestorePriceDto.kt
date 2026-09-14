package com.supermarkethelper.data.remote

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint
import com.supermarkethelper.data.local.PriceEntity
import com.supermarkethelper.domain.GeoHash
import com.supermarkethelper.domain.model.CommunityPrice
import java.util.Date

fun PriceEntity.toFirestoreMap(uid: String): Map<String, Any> = hashMapOf(
    "barcode" to barcode,
    "productName" to (productName ?: ""),
    "price" to price,
    "currency" to currency,
    "storeName" to storeName,
    "location" to GeoPoint(latitude, longitude),
    "geohash" to geohash,
    "scannedAt" to Timestamp(Date(scannedAt)),
    "contributorUid" to uid,
    "schemaVersion" to schemaVersion,
)

fun Map<String, Any>.toCommunityPrice(id: String): CommunityPrice? {
    val barcode = this["barcode"] as? String ?: return null
    val price = (this["price"] as? Number)?.toDouble() ?: return null
    val storeName = this["storeName"] as? String ?: ""
    val geohash = this["geohash"] as? String ?: ""
    val scannedAt = (this["scannedAt"] as? Timestamp)?.toDate()?.time ?: return null
    val productName = this["productName"] as? String ?: ""
    return CommunityPrice(
        id = id,
        barcode = barcode,
        productName = productName,
        price = price,
        storeName = storeName,
        geohash = geohash,
        scannedAt = scannedAt,
    )
}

fun List<CommunityPrice>.dedupeVisually(): List<CommunityPrice> {
    val grouped = mutableListOf<CommunityPrice>()
    for (item in this.sortedByDescending { it.scannedAt }) {
        val existing = grouped.indexOfFirst { other ->
            other.barcode == item.barcode &&
                other.geohash == item.geohash &&
                kotlin.math.abs(other.price - item.price) < 0.001 &&
                kotlin.math.abs(other.scannedAt - item.scannedAt) < 10 * 60 * 1000
        }
        if (existing >= 0) {
            grouped[existing] = grouped[existing].copy(confirmedCount = grouped[existing].confirmedCount + 1)
        } else {
            grouped += item
        }
    }
    return grouped
}

fun nearbyHashes(geohash: String?): Set<String> {
    if (geohash.isNullOrBlank()) return emptySet()
    return GeoHash.neighbors(geohash).toSet()
}