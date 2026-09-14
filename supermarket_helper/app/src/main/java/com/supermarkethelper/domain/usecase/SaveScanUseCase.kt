package com.supermarkethelper.domain.usecase

import com.supermarkethelper.domain.GeoHash
import com.supermarkethelper.domain.PriceValidator
import com.supermarkethelper.domain.model.Price
import com.supermarkethelper.domain.model.ScanDraft
import com.supermarkethelper.domain.model.SyncStatus
import com.supermarkethelper.domain.repo.PriceRepository
import java.util.UUID
import javax.inject.Inject

class SaveScanUseCase @Inject constructor(
    private val repository: PriceRepository,
) {
    suspend operator fun invoke(draft: ScanDraft): Result<Price> {
        val barcode = draft.barcode.trim()
        if (!PriceValidator.barcodeValid(barcode)) {
            return Result.failure(IllegalArgumentException("Codice a barre non valido"))
        }
        val priceValue = PriceValidator.parsePrice(draft.priceText)
            ?: return Result.failure(IllegalArgumentException("Prezzo non valido"))
        val storeName = draft.storeName.trim()
        if (storeName.isEmpty()) {
            return Result.failure(IllegalArgumentException("Inserisci il nome del negozio"))
        }
        if (draft.location == null && !draft.saveWithoutMap) {
            return Result.failure(IllegalArgumentException("Posizione mancante. Riprova il GPS oppure salva senza mappa."))
        }
        val now = System.currentTimeMillis()
        val location = draft.location
        val lat = location?.latitude ?: 0.0
        val lng = location?.longitude ?: 0.0
        val entity = Price(
            id = UUID.randomUUID().toString(),
            barcode = barcode,
            productName = draft.productName.trim().ifBlank { null },
            price = priceValue,
            currency = "EUR",
            storeName = storeName,
            latitude = lat,
            longitude = lng,
            accuracyMeters = location?.accuracyMeters,
            geohash = if (location == null) "" else GeoHash.encode(lat, lng),
            scannedAt = PriceValidator.clampScannedAt(draft.scannedAt, now),
            capturedAt = now,
            syncStatus = SyncStatus.PENDING,
            syncRetryCount = 0,
            lastSyncError = null,
            lastSyncedAt = null,
            schemaVersion = 1,
        )
        repository.save(entity)
        return Result.success(entity)
    }
}