package expo.modules.notificationlistener

import android.content.ComponentName
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      val flat = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      )
      val componentName = ComponentName(context, RFNotificationListenerService::class.java)
      flat?.contains(componentName.flattenToString()) == true
    }

    Function("openPermissionSettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = android.content.Intent(
        "android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"
      )
      intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
      context.startActivity(intent)
    }
  }
}
