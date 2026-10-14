type FlutterWebview = {
  callHandler: (name: string, ...args: unknown[]) => Promise<unknown>;
};

export const notifyIncomingCall = (data: { callerName: string; isVideo: boolean; callId: string }) => {
  try {
    const bridge = (window as unknown as { flutter_inappwebview?: FlutterWebview }).flutter_inappwebview;
    bridge?.callHandler?.("onIncomingCall", data);
  } catch (e) { void e; }
};

export const notifyCallEnded = (data: { callId: string; reason: "cancelled" | "accepted" | "declined" | "timeout" }) => {
  try {
    const bridge = (window as unknown as { flutter_inappwebview?: FlutterWebview }).flutter_inappwebview;
    bridge?.callHandler?.("onCallEnded", data);
  } catch (e) { void e; }
};

export const isNativeApp = () =>
  typeof window !== "undefined" &&
  !!(window as unknown as { flutter_inappwebview?: unknown }).flutter_inappwebview;
