package com.supermarkethelper.data.sync

import androidx.work.Constraints
import androidx.work.NetworkType

object SyncConstraints {
    const val UNIQUE_WORK = "sync_prices"
    const val PERIODIC_WORK = "sync_prices_periodic"
    const val BATCH_SIZE = 400
    const val MAX_BATCHES_PER_RUN = 2

    val network: Constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()
}