package com.supermarkethelper.domain

object PriceValidator {
    private val ean = Regex("""\d{8,14}""")
    private val generic = Regex("""[A-Za-z0-9]{4,20}""")

    fun barcodeValid(barcode: String): Boolean {
        val trimmed = barcode.trim()
        return ean.matches(trimmed) || generic.matches(trimmed)
    }

    fun priceValid(price: Double): Boolean = price in 0.01..9999.0

    fun parsePrice(text: String): Double? {
        val normalized = text.trim().replace("€", "").replace(" ", "").replace(",", ".")
        val value = normalized.toDoubleOrNull() ?: return null
        return value.takeIf(::priceValid)
    }

    fun clampScannedAt(scannedAt: Long, now: Long = System.currentTimeMillis()): Long {
        val max = now + 5 * 60 * 1000
        return minOf(scannedAt, max)
    }
}