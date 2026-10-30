import { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EnableCallPushBanner from "@/components/EnableCallPushBanner";
import InstallAppBanner from "@/components/InstallAppBanner";
import NotFound from "@/pages/NotFound";
import { UserMediaProvider } from "@/context/UserMediaContext";
import { UnreadProvider } from "@/context/UnreadContext";
import { useAuth } from "@/context/AuthContext";
import AgeGate from "@/components/AgeGate";
import ProfileSetupGate from "@/components/ProfileSetupGate";
import IncomingCallModal from "./IncomingCallModal";
import type { IncomingCall } from "./useIncomingCall";

const Index = lazy(() => import("@/pages/Index"));
const MediaDeepLink = lazy(() => import("@/components/MediaDeepLink"));
const ArticleDeepLink = lazy(() => import("@/components/profile/ArticleDeepLink"));
const CallScreen = lazy(() => import("@/components/CallScreen"));
const ThumbnailWorker = lazy(() => import("@/components/ThumbnailWorker"));

type AuthState = ReturnType<typeof useAuth>;

interface AuthenticatedAppProps {
  user: NonNullable<AuthState["user"]>;
  token: AuthState["token"];
  activeCall: IncomingCall | null;
  incomingCall: IncomingCall | null;
  onEndCall: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

const AuthenticatedApp = ({ user, token, activeCall, incomingCall, onEndCall, onAccept, onDecline }: AuthenticatedAppProps) => (
  <UserMediaProvider userId={user.id} token={token}>
    <UnreadProvider>
    <ThumbnailWorker />
    <AgeGate />
    <ProfileSetupGate />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><Index /><ArticleDeepLink /><MediaDeepLink /></>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>

    {activeCall && (
      <div className="fixed inset-0 z-[10000]">
        <CallScreen
          name={activeCall.callerName}
          avatar=""
          mode={activeCall.mode}
          myId={user.id}
          peerId={activeCall.callerId}
          isCaller={false}
          onEnd={onEndCall}
        />
      </div>
    )}

    <InstallAppBanner />
    {user && <EnableCallPushBanner userId={user.id} userName={user.name} />}
    {incomingCall && (
      <IncomingCallModal incomingCall={incomingCall} onDecline={onDecline} onAccept={onAccept} />
    )}
    </UnreadProvider>
  </UserMediaProvider>
);

export default AuthenticatedApp;
