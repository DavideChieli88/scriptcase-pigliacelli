package com.supermarkethelper.presentation.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.supermarkethelper.data.connectivity.ConnectivityObserver
import com.supermarkethelper.presentation.common.OfflineBanner
import com.supermarkethelper.presentation.history.HistoryScreen
import com.supermarkethelper.presentation.lookup.LookupScreen
import com.supermarkethelper.presentation.privacy.PrivacyScreen
import com.supermarkethelper.presentation.scan.ScanScreen
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ConnectivityViewModel @Inject constructor(
    observer: ConnectivityObserver,
) : ViewModel() {
    val isOnline = observer.isOnline
}

private data class TopDest(val route: String, val label: String, val icon: ImageVector)

@Composable
fun AppRoot(
    connectivityViewModel: ConnectivityViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val isOnline by connectivityViewModel.isOnline.collectAsStateWithLifecycle()
    val dests = listOf(
        TopDest("scan", "Scansiona", Icons.Outlined.QrCodeScanner),
        TopDest("history", "I miei prezzi", Icons.Outlined.History),
        TopDest("lookup", "Community", Icons.Outlined.Search),
    )
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            if (current != "privacy") {
                NavigationBar {
                    dests.forEach { dest ->
                        NavigationBarItem(
                            selected = current == dest.route,
                            onClick = {
                                navController.navigate(dest.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(dest.icon, contentDescription = dest.label) },
                            label = { Text(dest.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            OfflineBanner(isOnline = isOnline)
            NavHost(navController = navController, startDestination = "scan") {
                composable("scan") { ScanScreen() }
                composable("history") { HistoryScreen(onPrivacy = { navController.navigate("privacy") }) }
                composable("lookup") { LookupScreen() }
                composable("privacy") { PrivacyScreen() }
            }
        }
    }
}