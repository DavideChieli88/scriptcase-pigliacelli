package com.supermarkethelper.data.sync

import com.supermarkethelper.data.connectivity.ConnectivityObserver
import com.supermarkethelper.di.ApplicationScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncBootstrap @Inject constructor(
    private val observer: ConnectivityObserver,
    private val scheduler: SyncScheduler,
    @ApplicationScope private val scope: CoroutineScope,
) {
    fun start() {
        scheduler.enqueuePeriodic()
        observer.isOnline
            .distinctUntilChanged()
            .filter { it }
            .onEach { scheduler.enqueue() }
            .launchIn(scope)
    }
}