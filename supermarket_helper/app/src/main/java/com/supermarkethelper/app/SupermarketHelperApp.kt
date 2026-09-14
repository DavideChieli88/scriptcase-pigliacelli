package com.supermarkethelper.app

import android.app.Application
import android.util.Log
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.google.firebase.FirebaseApp
import com.supermarkethelper.data.sync.SyncBootstrap
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class SupermarketHelperApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory
    @Inject lateinit var syncBootstrap: SyncBootstrap

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this)
            }
            AppCheckInstaller.install()
        } catch (error: Throwable) {
            Log.w(TAG, "Firebase init skipped; offline capture still works", error)
        }
        syncBootstrap.start()
    }

    private companion object {
        const val TAG = "SupermarketHelper"
    }
}