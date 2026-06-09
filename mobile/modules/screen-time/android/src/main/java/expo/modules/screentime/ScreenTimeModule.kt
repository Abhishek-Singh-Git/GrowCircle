package expo.modules.screentime

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.*

class ScreenTimeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScreenTimeModule")

    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val currentTime = System.currentTimeMillis()
      val stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, currentTime - 1000 * 60, currentTime)
      return@Function stats != null && stats.isNotEmpty()
    }

    Function("requestPermission") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("getTodayUsage") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      
      val calendar = Calendar.getInstance()
      calendar.set(Calendar.HOUR_OF_DAY, 0)
      calendar.set(Calendar.MINUTE, 0)
      calendar.set(Calendar.SECOND, 0)
      calendar.set(Calendar.MILLISECOND, 0)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()

      val usageStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
      val result = mutableListOf<Map<String, Any>>()

      if (usageStats != null) {
        for (stats in usageStats) {
          if (stats.totalTimeInForeground > 0) {
            val appInfo = context.packageManager.getApplicationInfo(stats.packageName, 0)
            val appName = context.packageManager.getApplicationLabel(appInfo).toString()
            
            result.add(mapOf(
              "packageName" to stats.packageName,
              "appName" to appName,
              "totalTimeInForeground" to (stats.totalTimeInForeground / 1000), // convert to seconds
              "lastTimeUsed" to stats.lastTimeUsed
            ))
          }
        }
      }
      return@AsyncFunction result
    }
  }
}
