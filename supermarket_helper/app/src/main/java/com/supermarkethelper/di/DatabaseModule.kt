package com.supermarkethelper.di

import android.content.Context
import androidx.room.Room
import com.supermarkethelper.data.local.AppDatabase
import com.supermarkethelper.data.local.PriceDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun database(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "supermarket_helper.db")
            .build()

    @Provides
    fun priceDao(database: AppDatabase): PriceDao = database.priceDao()
}