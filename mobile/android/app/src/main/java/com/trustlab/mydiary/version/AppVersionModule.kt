package com.trustlab.mydiary.version

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.module.annotations.ReactModule

/**
 * The version of the app that is actually installed on this phone.
 *
 * Android is the one source that cannot be wrong. The version written into the JavaScript at build
 * time (src/update/appVersion.js) is only a fallback: if a build ever ships with the previous
 * number in it, every phone that installs it is told to update for ever.
 *
 * It is exposed as a constant rather than a method so JavaScript can read it without waiting.
 */
@ReactModule(name = AppVersionModule.NAME)
class AppVersionModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  override fun getConstants(): Map<String, Any?> {
    val context = reactApplicationContext
    val versionName = try {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName
    } catch (e: Exception) {
      null
    }
    return mapOf(
      "versionName" to versionName,
      "packageName" to context.packageName,
    )
  }

  companion object {
    const val NAME = "AppVersionInfo"
  }
}
