package com.supermarkethelper.presentation.common

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.supermarkethelper.R
import com.supermarkethelper.domain.model.SyncStatus

@Composable
fun SyncStatusChip(
    status: SyncStatus,
    onRetry: (() -> Unit)? = null,
) {
    val (label, icon) = when (status) {
        SyncStatus.PENDING -> stringResource(R.string.sync_pending) to Icons.Outlined.CloudOff
        SyncStatus.SYNCED -> stringResource(R.string.sync_synced) to Icons.Outlined.CheckCircle
        SyncStatus.FAILED -> stringResource(R.string.sync_failed) to Icons.Outlined.ErrorOutline
    }
    AssistChip(
        onClick = {
            if (status == SyncStatus.FAILED) onRetry?.invoke()
        },
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = label) },
        enabled = status == SyncStatus.FAILED && onRetry != null,
    )
}