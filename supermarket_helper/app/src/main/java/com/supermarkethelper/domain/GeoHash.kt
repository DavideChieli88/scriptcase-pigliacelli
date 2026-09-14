package com.supermarkethelper.domain

object GeoHash {
    private const val BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    private val NEIGHBORS = mapOf(
        "n" to arrayOf("p0r21436x8zb9dcf5h7kjnmqesgutwvy", "bc01fg45238967deuvhjyznpkmstqrwx"),
        "s" to arrayOf("14365h7k9dcfesgujnmqp0r2twvyx8zb", "238967debc01fg45kmstqrwxuvhjyznp"),
        "e" to arrayOf("bc01fg45238967deuvhjyznpkmstqrwx", "p0r21436x8zb9dcf5h7kjnmqesgutwvy"),
        "w" to arrayOf("238967debc01fg45kmstqrwxuvhjyznp", "14365h7k9dcfesgujnmqp0r2twvyx8zb"),
    )
    private val BORDERS = mapOf(
        "n" to arrayOf("prxz", "bcfguvyz"),
        "s" to arrayOf("028b", "0145hjnp"),
        "e" to arrayOf("bcfguvyz", "prxz"),
        "w" to arrayOf("0145hjnp", "028b"),
    )

    fun encode(latitude: Double, longitude: Double, precision: Int = 7): String {
        if (latitude == 0.0 && longitude == 0.0) return ""
        var minLat = -90.0
        var maxLat = 90.0
        var minLon = -180.0
        var maxLon = 180.0
        val builder = StringBuilder()
        var bit = 0
        var ch = 0
        var even = true
        while (builder.length < precision) {
            if (even) {
                val mid = (minLon + maxLon) / 2
                if (longitude >= mid) {
                    ch = ch or (1 shl (4 - bit))
                    minLon = mid
                } else {
                    maxLon = mid
                }
            } else {
                val mid = (minLat + maxLat) / 2
                if (latitude >= mid) {
                    ch = ch or (1 shl (4 - bit))
                    minLat = mid
                } else {
                    maxLat = mid
                }
            }
            even = !even
            if (bit < 4) {
                bit++
            } else {
                builder.append(BASE32[ch])
                bit = 0
                ch = 0
            }
        }
        return builder.toString()
    }

    fun neighbors(hash: String): List<String> {
        if (hash.isBlank()) return emptyList()
        return listOf(
            hash,
            adjacent(hash, "n"),
            adjacent(hash, "s"),
            adjacent(hash, "e"),
            adjacent(hash, "w"),
            adjacent(adjacent(hash, "n"), "e"),
            adjacent(adjacent(hash, "n"), "w"),
            adjacent(adjacent(hash, "s"), "e"),
            adjacent(adjacent(hash, "s"), "w"),
        ).distinct()
    }

    private fun adjacent(hash: String, dir: String): String {
        if (hash.isEmpty()) return hash
        val last = hash.last()
        val type = hash.length % 2
        val parent = hash.dropLast(1)
        val border = BORDERS.getValue(dir)[type]
        val neighbor = NEIGHBORS.getValue(dir)[type]
        val base = if (border.contains(last) && parent.isNotEmpty()) {
            adjacent(parent, dir)
        } else {
            parent
        }
        val idx = neighbor.indexOf(last)
        if (idx < 0) return hash
        return base + BASE32[idx]
    }
}