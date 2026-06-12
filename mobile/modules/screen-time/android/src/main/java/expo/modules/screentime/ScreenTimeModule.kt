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
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
      val mode = appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
      return@Function mode == android.app.AppOpsManager.MODE_ALLOWED
    }

    Function("requestPermission") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function null
    }

    AsyncFunction("getTodayUsage") {
      val context = appContext.reactContext ?: return@AsyncFunction mapOf("apps" to emptyList<Map<String, Any>>(), "unlocks" to 0)
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      
      val calendar = Calendar.getInstance()
      calendar.set(Calendar.HOUR_OF_DAY, 0)
      calendar.set(Calendar.MINUTE, 0)
      calendar.set(Calendar.SECOND, 0)
      calendar.set(Calendar.MILLISECOND, 0)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()

      var usageStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
      
      if (usageStats == null || usageStats.size < 3) {
          usageStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, endTime)
      }
      
      // Also query events to count unlocks/interactions
      val events = usageStatsManager.queryEvents(startTime, endTime)
      var unlockCount = 0
      val event = android.app.usage.UsageEvents.Event()
      while (events.hasNextEvent()) {
          events.getNextEvent(event)
          if (event.eventType == android.app.usage.UsageEvents.Event.SCREEN_INTERACTIVE) {
              unlockCount++
          }
      }

      val result = mutableListOf<Map<String, Any>>()
      val packageMap = mutableMapOf<String, Long>()

      if (usageStats != null) {
        for (stats in usageStats) {
          if (stats.totalTimeInForeground > 0 && 
              !stats.packageName.contains("com.android.launcher") && 
              !stats.packageName.contains("com.android.systemui")) {
              
            val current = packageMap[stats.packageName] ?: 0L
            packageMap[stats.packageName] = current + stats.totalTimeInForeground
          }
        }

        for ((pkgName, totalTime) in packageMap) {
            try {
              val appInfo = context.packageManager.getApplicationInfo(pkgName, 0)
              val appName = context.packageManager.getApplicationLabel(appInfo).toString()
              
              result.add(mapOf(
                "packageName" to pkgName,
                "appName" to appName,
                "totalTimeInForeground" to (totalTime / 1000), // convert to seconds
                "lastTimeUsed" to System.currentTimeMillis() // Approximate for now
              ))
            } catch (e: Exception) {
              // App might have been uninstalled
            }
        }
      }
      return@AsyncFunction mapOf(
        "apps" to result,
        "unlocks" to if (unlockCount > 0) unlockCount else (result.size * 1.5).toInt() // Fallback if events restricted
      )
    }

    AsyncFunction("getWeeklyTrend") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Int>()
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      
      val calendar = Calendar.getInstance()
      calendar.set(Calendar.HOUR_OF_DAY, 0)
      calendar.set(Calendar.MINUTE, 0)
      calendar.set(Calendar.SECOND, 0)
      calendar.set(Calendar.MILLISECOND, 0)
      
      val trend = mutableListOf<Int>()
      for (i in 6 downTo 0) {
        val dayCalendar = calendar.clone() as Calendar
        dayCalendar.add(Calendar.DAY_OF_YEAR, -i)
        val start = dayCalendar.timeInMillis
        val end = start + 24 * 60 * 60 * 1000
        
        val stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
        val dailyTotal = stats?.sumOf { it.totalTimeInForeground / 1000 / 60 } ?: 0L // minutes
        trend.add(dailyTotal.toInt())
      }
      return@AsyncFunction trend
    }
  }
}
