type FlutterWebview = {
  callHandler: (name: string, ...args: unknown[]) => Promise<unknown>;
};

export const notifyIncomingCall = (data: { callerName: string; isVideo: boolean; callId: string }) => {
  try {
    const bridge = (window as unknown as { flutter_inappwebview?: FlutterWebview }).flutter_inappwebview;
    bridge?.callHandler?.("onIncomingCall", data);
  } catch (e) { void e; }
};
