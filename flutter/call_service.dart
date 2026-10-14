import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String chatApi = 'https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c';
const String _serviceChannelId = 'look_service';
const String _callChannelId = 'incoming_calls';

class CallService {
  static Future<void> init() async {
    final notifications = FlutterLocalNotificationsPlugin();
    final android = notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(const AndroidNotificationChannel(
      _serviceChannelId,
      'Фоновая работа',
      importance: Importance.low,
    ));
    await FlutterBackgroundService().configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onServiceStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: _serviceChannelId,
        initialNotificationTitle: 'Look',
        initialNotificationContent: 'Ожидание входящих звонков',
        foregroundServiceNotificationId: 7001,
      ),
      iosConfiguration: IosConfiguration(autoStart: false),
    );
  }

  static Future<void> login(String userId, String userName) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('look_user_id', userId);
    await prefs.setString('look_user_name', userName);
    final service = FlutterBackgroundService();
    if (!await service.isRunning()) await service.startService();
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('look_user_id');
    await prefs.remove('look_user_name');
    FlutterBackgroundService().invoke('stop');
  }
}

@pragma('vm:entry-point')
void onServiceStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  final notifications = FlutterLocalNotificationsPlugin();
  await notifications.initialize(
    const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
  );

  service.on('stop').listen((_) => service.stopSelf());

  var lastId = 0;
  Timer.periodic(const Duration(seconds: 5), (_) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final userId = prefs.getString('look_user_id');
    if (userId == null || userId.isEmpty) {
      service.stopSelf();
      return;
    }
    final userName = prefs.getString('look_user_name') ?? '';
    try {
      final res = await http.get(
        Uri.parse('$chatApi?module=signal&room_id=incoming_$userId&since_id=$lastId&max_age_seconds=30'),
        headers: {'X-User-Id': userId, 'X-User-Name': Uri.encodeComponent(userName)},
      ).timeout(const Duration(seconds: 4));
      final raw = jsonDecode(res.body);
      final data = raw['body'] is String ? jsonDecode(raw['body']) : raw;
      for (final sig in (data['signals'] as List? ?? [])) {
        lastId = sig['id'] as int;
        if (sig['type'] == 'call_invite' && sig['payload'] != null) {
          final p = sig['payload'];
          final isVideo = p['mode'] == 'video';
          await notifications.show(
            sig['id'].toString().hashCode,
            (p['callerName'] ?? 'Входящий звонок').toString(),
            isVideo ? 'Входящий видеозвонок' : 'Входящий вызов',
            NotificationDetails(
              android: AndroidNotificationDetails(
                _callChannelId,
                'Входящие вызовы',
                category: AndroidNotificationCategory.call,
                importance: Importance.max,
                priority: Priority.max,
                fullScreenIntent: true,
                ongoing: true,
                autoCancel: false,
                timeoutAfter: 30000,
                actions: const [
                  AndroidNotificationAction('decline', 'Отклонить', showsUserInterface: false, cancelNotification: true),
                  AndroidNotificationAction('accept', 'Принять', showsUserInterface: true, cancelNotification: true),
                ],
              ),
            ),
            payload: jsonEncode({'callId': sig['id'].toString()}),
          );
        } else if (sig['type'] == 'call_cancel') {
          await notifications.cancelAll();
        }
      }
    } catch (_) {}
  });
}
