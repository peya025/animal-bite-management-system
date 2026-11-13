# Flutter Wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Google Sign-In & Play Services Auth
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Image Picker & URL Launcher
-keep class io.flutter.plugins.imagepicker.** { *; }
-keep class io.flutter.plugins.urllauncher.** { *; }

# Keep native methods and classes with annotations
-keepclasseswithmembernames class * {
    native <methods>;
}

# Flutter Deferred Components / Play Core
-dontwarn com.google.android.play.core.**

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
