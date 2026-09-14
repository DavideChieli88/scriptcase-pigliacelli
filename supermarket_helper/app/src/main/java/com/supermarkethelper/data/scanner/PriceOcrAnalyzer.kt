package com.supermarkethelper.data.scanner

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.supermarkethelper.domain.PriceValidator

class PriceOcrAnalyzer(
    private val onPrice: (String) -> Unit,
) : ImageAnalysis.Analyzer {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private var lastEmittedAt = 0L
    private var frame = 0

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        frame++
        if (frame % 4 != 0) {
            imageProxy.close()
            return
        }
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        recognizer.process(image)
            .addOnSuccessListener { result ->
                val candidate = pickPrice(result.text) ?: return@addOnSuccessListener
                val now = System.currentTimeMillis()
                if (now - lastEmittedAt > 1_000) {
                    lastEmittedAt = now
                    onPrice(candidate)
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }

    fun close() {
        recognizer.close()
    }

    private fun pickPrice(text: String): String? {
        val euro = EURO_REGEX.findAll(text).map { it.groupValues[1] }
        val plain = PLAIN_REGEX.findAll(text).map { it.groupValues[1] }
        return (euro + plain)
            .mapNotNull { raw ->
                val parsed = PriceValidator.parsePrice(raw)
                parsed?.let { raw.replace(".", ",") }
            }
            .firstOrNull()
    }

    private companion object {
        val EURO_REGEX = Regex("""€\s*(\d{1,4}(?:[.,]\d{1,2})?)""")
        val PLAIN_REGEX = Regex("""(\d{1,3}[.,]\d{2})""")
    }
}