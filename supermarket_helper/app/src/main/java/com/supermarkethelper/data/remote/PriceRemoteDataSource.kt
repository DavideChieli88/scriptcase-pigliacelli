package com.supermarkethelper.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.supermarkethelper.data.local.PriceEntity
import com.supermarkethelper.domain.model.CommunityPrice
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PriceRemoteDataSource @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
) {
    suspend fun ensureSignedIn() {
        if (auth.currentUser == null) {
            auth.signInAnonymously().await()
        }
    }

    suspend fun uploadBatch(prices: List<PriceEntity>) {
        val uid = auth.currentUser?.uid ?: error("Not signed in")
        val batch = firestore.batch()
        prices.forEach { entity ->
            val ref = firestore.collection(COLLECTION).document(entity.id)
            batch.set(ref, entity.toFirestoreMap(uid), SetOptions.merge())
        }
        batch.commit().await()
    }

    suspend fun lookup(barcode: String): List<CommunityPrice> {
        ensureSignedIn()
        val snapshot = firestore.collection(COLLECTION)
            .whereEqualTo("barcode", barcode)
            .orderBy("scannedAt", Query.Direction.DESCENDING)
            .limit(30)
            .get()
            .await()
        return snapshot.documents.mapNotNull { doc ->
            @Suppress("UNCHECKED_CAST")
            (doc.data as? Map<String, Any>)?.toCommunityPrice(doc.id)
        }
    }

    fun isPermanent(error: Throwable): Boolean {
        val code = (error as? FirebaseFirestoreException)?.code
        if (isAppCheck(error)) return false
        return code == FirebaseFirestoreException.Code.INVALID_ARGUMENT ||
            code == FirebaseFirestoreException.Code.PERMISSION_DENIED
    }

    private fun isAppCheck(error: Throwable): Boolean {
        val message = error.message.orEmpty()
        return message.contains("app check", ignoreCase = true) ||
            message.contains("app attestation", ignoreCase = true)
    }

    private companion object {
        const val COLLECTION = "price_reports"
    }
}