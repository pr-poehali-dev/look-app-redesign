# Подключение звонков во Flutter (работают и при закрытом приложении)

1. pubspec.yaml: flutter_inappwebview, flutter_local_notifications, flutter_background_service, http, shared_preferences
2. Скопировать call_bridge.dart и call_service.dart в lib/
3. main(): await CallBridge.instance.init(); await CallService.init();
4. InAppWebView: onWebViewCreated: (c) => CallBridge.instance.attach(c);
   onLoadStop: (c, u) => CallBridge.instance.flushPending(u)
5. AndroidManifest.xml: разрешения POST_NOTIFICATIONS, USE_FULL_SCREEN_INTENT, VIBRATE,
   FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, RECEIVE_BOOT_COMPLETED
   и внутри application:
   <service android:name="id.flutter.flutter_background_service.BackgroundService"
            android:foregroundServiceType="dataSync" android:exported="false"/>
6. Попросить пользователя отключить для приложения экономию батареи (Xiaomi, Huawei, Samsung)
