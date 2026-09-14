package com.supermarkethelper.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PriceValidatorTest {
    @Test
    fun barcodeAcceptsEan13() {
        assertTrue(PriceValidator.barcodeValid("8001234567890"))
    }

    @Test
    fun barcodeRejectsShort() {
        assertFalse(PriceValidator.barcodeValid("12"))
    }

    @Test
    fun parseItalianPrice() {
        assertEquals(2.49, PriceValidator.parsePrice("2,49")!!, 0.0)
        assertEquals(1.99, PriceValidator.parsePrice("€ 1,99")!!, 0.0)
    }

    @Test
    fun clampFutureTimestamp() {
        val now = 1_000_000L
        val tooFar = now + 10 * 60 * 1000
        assertEquals(now + 5 * 60 * 1000, PriceValidator.clampScannedAt(tooFar, now))
    }
}

class GeoHashTest {
    @Test
    fun encodeHasPrecision7() {
        val hash = GeoHash.encode(45.4642, 9.1900)
        assertEquals(7, hash.length)
    }

    @Test
    fun originIsEmpty() {
        assertEquals("", GeoHash.encode(0.0, 0.0))
    }

    @Test
    fun neighborsIncludeSelf() {
        val hash = GeoHash.encode(41.9028, 12.4964)
        val neighbors = GeoHash.neighbors(hash)
        assertTrue(neighbors.contains(hash))
        assertEquals(9, neighbors.size)
    }
}