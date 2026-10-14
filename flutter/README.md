# Подключение звонков во Flutter

1. pubspec.yaml: flutter_inappwebview, flutter_local_notifications
2. Скопировать call_bridge.dart в lib/
3. main(): await CallBridge.instance.init();
4. InAppWebView: onWebViewCreated: (c) => CallBridge.instance.attach(c)
5. AndroidManifest.xml: разрешения POST_NOTIFICATIONS, USE_FULL_SCREEN_INTENT, VIBRATE

Кнопки уведомления сами передают решение на сайт (событие look-call-action или параметр ?call_action=accept|decline в адресе), вызывать lookCallAction не нужно.
