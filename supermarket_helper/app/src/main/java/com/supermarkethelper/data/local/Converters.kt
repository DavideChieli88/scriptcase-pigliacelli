package com.supermarkethelper.data.local

import androidx.room.TypeConverter
import com.supermarkethelper.domain.model.SyncStatus

class Converters {
    @TypeConverter
    fun toSyncStatus(value: String): SyncStatus = SyncStatus.valueOf(value)

    @TypeConverter
    fun fromSyncStatus(value: SyncStatus): String = value.name
}