import { createRoot } from 'react-dom/client'
import { initExternalLinks } from './lib/externalLinks'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './i18n'
import { installResilientFetch } from './lib/resilientFetch'
import { installDomGuard } from './lib/domGuard'

installDomGuard();
installResilientFetch();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/OneSignalSDKWorker.js').catch(() => {});
  });
}

initExternalLinks();
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);