package expo.modules.notificationlistener

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject

class RFNotificationListenerService : NotificationListenerService() {

  companion object {
    val TARGET_PACKAGES = setOf(
      "com.ubercab.driver",
      "com.ubercab",
      "com.taxis99",
      "br.com.taxis99.driver",
    )
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    sbn ?: return
    if (sbn.packageName !in TARGET_PACKAGES) return

    val notification = sbn.notification ?: return
    val extras = notification.extras ?: return

    val title = extras.getString("android.title") ?: ""
    val body = (extras.getCharSequence("android.bigText")?.toString()
      ?: extras.getString("android.text")) ?: ""

    Log.d("RFListener", "Notificação: $title | $body | ${sbn.packageName}")

    val intent = android.content.Intent("com.motoristarico.NOTIFICATION")
    intent.putExtra("title", title)
    intent.putExtra("body", body)
    intent.putExtra("packageName", sbn.packageName)
    intent.putExtra("timestamp", System.currentTimeMillis())
    sendBroadcast(intent)
  }
}
