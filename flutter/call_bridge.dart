import 'dart:convert';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class CallBridge {
  CallBridge._();
  static final CallBridge instance = CallBridge._();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  InAppWebViewController? _web;
  String? _activeCallId;

  static const String _channelId = 'incoming_calls';
  static const String _actionAccept = 'accept';
  static const String _actionDecline = 'decline';

  Future<void> init() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _notifications.initialize(
      const InitializationSettings(android: android),
      onDidReceiveNotificationResponse: _onNotificationResponse,
      onDidReceiveBackgroundNotificationResponse: onBackgroundNotificationResponse,
    );
    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
    await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
      _channelId,
      'Входящие вызовы',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    ));
  }

  void attach(InAppWebViewController controller) {
    _web = controller;

    controller.addJavaScriptHandler(
      handlerName: 'onIncomingCall',
      callback: (args) {
        final d = Map<String, dynamic>.from(args[0] as Map);
        _showIncoming(
          callId: d['callId'].toString(),
          callerName: d['callerName'].toString(),
          isVideo: d['isVideo'] == true,
        );
        return null;
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'onCallEnded',
      callback: (args) {
        final d = Map<String, dynamic>.from(args[0] as Map);
        _cancel(d['callId']?.toString());
        return null;
      },
    );
  }

  Future<void> _showIncoming({
    required String callId,
    required String callerName,
    required bool isVideo,
  }) async {
    _activeCallId = callId;
    final details = AndroidNotificationDetails(
      _channelId,
      'Входящие вызовы',
      category: AndroidNotificationCategory.call,
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true,
      ongoing: true,
      autoCancel: false,
      timeoutAfter: 30000,
      actions: [
        const AndroidNotificationAction(
          _actionDecline,
          'Отклонить',
          showsUserInterface: false,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          _actionAccept,
          isVideo ? 'Видео' : 'Принять',
          showsUserInterface: true,
          cancelNotification: true,
        ),
      ],
    );
    await _notifications.show(
      callId.hashCode,
      callerName,
      isVideo ? 'Входящий видеозвонок' : 'Входящий вызов',
      NotificationDetails(android: details),
      payload: jsonEncode({'callId': callId}),
    );
  }

  Future<void> _cancel(String? callId) async {
    final id = callId ?? _activeCallId;
    if (id == null || id.isEmpty) return;
    await _notifications.cancel(id.hashCode);
    if (_activeCallId == id) _activeCallId = null;
  }

  void _onNotificationResponse(NotificationResponse response) {
    final action = response.actionId;
    if (action == _actionAccept || action == _actionDecline) {
      _sendActionToWeb(action!);
    } else {
      _sendActionToWeb(_actionAccept);
    }
  }

  Future<void> _sendActionToWeb(String action) async {
    final web = _web;
    if (web == null) return;
    await web.evaluateJavascript(
      source: "window.lookCallAction && window.lookCallAction('$action')",
    );
  }
}

@pragma('vm:entry-point')
void onBackgroundNotificationResponse(NotificationResponse response) {}
