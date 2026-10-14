# Подключение звонков во Flutter

1. pubspec.yaml: flutter_inappwebview, flutter_local_notifications
2. Скопировать call_bridge.dart в lib/
3. Взять main_example.dart за основу: вставить адрес сайта в siteUrl
4. AndroidManifest.xml: разрешения POST_NOTIFICATIONS, USE_FULL_SCREEN_INTENT, VIBRATE, CAMERA, RECORD_AUDIO

Если WebView уже есть, добавьте только три вещи:
- await CallBridge.instance.init(); в main()
- onWebViewCreated: (c) => CallBridge.instance.attach(c)
- onLoadStop: (c, u) => CallBridge.instance.flushPending(Uri.parse(siteUrl))

Кнопки уведомления сами передают решение на сайт, вызывать lookCallAction не нужно.
