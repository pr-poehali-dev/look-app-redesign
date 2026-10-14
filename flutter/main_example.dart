import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'call_bridge.dart';
import 'call_service.dart';

const String siteUrl = 'https://ВАШ-САЙТ';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CallBridge.instance.init();
  await CallService.init();
  runApp(const MaterialApp(home: WebScreen()));
}

class WebScreen extends StatelessWidget {
  const WebScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: InAppWebView(
          initialUrlRequest: URLRequest(url: WebUri(siteUrl)),
          initialSettings: InAppWebViewSettings(
            javaScriptEnabled: true,
            mediaPlaybackRequiresUserGesture: false,
            allowsInlineMediaPlayback: true,
          ),
          onWebViewCreated: (controller) => CallBridge.instance.attach(controller),
          onLoadStop: (controller, url) => CallBridge.instance.flushPending(Uri.parse(siteUrl)),
          onPermissionRequest: (controller, request) async => PermissionResponse(
            resources: request.resources,
            action: PermissionResponseAction.GRANT,
          ),
        ),
      ),
    );
  }
}
