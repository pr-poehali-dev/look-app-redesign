import {useEffect, type ReactNode} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import NotFound from "@/pages/NotFound";
import {initExternalLinks} from "@/lib/externalLinks";
import {installResilientFetch} from "@/lib/resilientFetch";
import {installDomGuard} from "@/lib/domGuard";
import {initInstallPrompt} from "@/lib/installPrompt";
import appCss from "@/index.css?url";

const TITLE = "Лоок — соцсеть: видео, эфиры, чаты и сообщества";
const DESCRIPTION =
    "Лоок — соцсеть: короткие видео, прямые эфиры, чаты и звонки, сообщества, редакторы, доски идей, магазин и статьи. Смотри, делись, общайся.";
const OG_IMAGE =
    "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/2b4d713a-6471-4217-b879-b9d73ebc7e01.jpg";
const KEYWORDS =
    "Лоок, соцсеть, социальная сеть, короткие видео, видео, ролики, прямые эфиры, стримы, онлайн трансляции, чаты, видеозвонки, голосовые звонки, сообщества, видео редактор, фото редактор, конструктор контента, реелс, российская соцсеть, визуальные доски, пинборды, коллекции, сохранение идей, товарные карточки, обзоры покупок, отзывы о товарах, рекомендации, длинные посты, статьи, шопинг, маркетплейс, встроенный магазин, алгоритмические рекомендации, лента рекомендаций, импорт контента, перенос из соцсетей";

const POLYFILLS = `(function () {
  try {
    if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext !== 'undefined') {
      window.AudioContext = window.webkitAudioContext;
    }
  } catch (e) {}
  try {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function (cb) { return window.setTimeout(function () { cb(Date.now()); }, 16); };
      window.cancelAnimationFrame = function (id) { window.clearTimeout(id); };
    }
  } catch (e) {}
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
    try {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: function() { return Promise.reject(new Error('getUserMedia_unsupported')); } },
        writable: true, configurable: true
      });
    } catch(e) {}
  }
})();`;

const BOOT_GUARD = `(function () {
  var RELOAD_KEY = 'look_boot_reload_ts';
  function tryAutoReload() {
    try {
      var last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      var now = Date.now();
      if (now - last > 10000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
        return true;
      }
    } catch (e) {}
    return false;
  }
  function showOutdatedMsg() {
    var el = document.getElementById('fallback-msg');
    if (el) el.style.display = 'flex';
  }
  window.setTimeout(function () {
    var root = document.getElementById('root');
    var mounted = root && root.getAttribute('data-app-mounted') === '1';
    if (!mounted) {
      if (!tryAutoReload()) showOutdatedMsg();
    }
  }, 15000);
  window.addEventListener('error', function (ev) {
    var msg = ev && ev.message ? String(ev.message) : '';
    if (msg.indexOf('SyntaxError') !== -1 || msg.indexOf('Unexpected token') !== -1) {
      if (!tryAutoReload()) showOutdatedMsg();
    }
  });
})();`;

const METRIKA = `(function () {
  function start() {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () {
        (m[i].a = m[i].a || []).push(arguments)
      };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) {
          return;
        }
      }
      k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    ym(101026698, "init", {
      trustedDomains: ["poehali.dev"],
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      trackHash: true
    });
  }
  function later() {
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 5000 });
    else setTimeout(start, 3000);
  }
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
})();`;

const JSON_LD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Лоок",
    url: "https://look.com.ru/",
    inLanguage: "ru-RU",
    description: DESCRIPTION,
});

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content",
            },
            {name: "theme-color", content: "#121212"},
            {httpEquiv: "X-Content-Type-Options", content: "nosniff"},
            {name: "referrer", content: "strict-origin-when-cross-origin"},
            {name: "google", content: "notranslate"},
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "keywords", content: KEYWORDS},
            {name: "author", content: "poehali.dev"},
            {property: "og:type", content: "website"},
            {property: "og:url", content: "https://look.com.ru/"},
            {property: "og:site_name", content: "Лоок"},
            {property: "og:locale", content: "ru_RU"},
            {property: "og:title", content: TITLE},
            {property: "og:description", content: DESCRIPTION},
            {property: "og:image:width", content: "1360"},
            {property: "og:image:height", content: "768"},
            {property: "og:image:alt", content: "Лоок — соцсеть для коротких видео, эфиров и общения"},
            {property: "og:image", content: OG_IMAGE},
            {name: "twitter:image", content: OG_IMAGE},
            {name: "mobile-web-app-capable", content: "yes"},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "preconnect", href: "https://functions.poehali.dev", crossOrigin: "anonymous"},
            {rel: "preconnect", href: "https://cdn.poehali.dev", crossOrigin: "anonymous"},
            {rel: "preload", as: "font", type: "font/woff2", href: "/fonts/GolosText-cyrillic-f57bdd.woff2", crossOrigin: "anonymous"},
            {rel: "stylesheet", href: "/fonts/fonts.css"},
            {rel: "stylesheet", href: appCss},
            {rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png"},
            {rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png"},
            {rel: "shortcut icon", href: "/favicon.ico"},
            {rel: "apple-touch-icon", href: "/apple-touch-icon.png"},
            {rel: "canonical", href: "https://look.com.ru/"},
            {rel: "manifest", href: "/manifest.webmanifest"},
        ],
        styles: [{children: "html,body{background:#121212;margin:0;padding:0}"}],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            {children: POLYFILLS},
            {children: BOOT_GUARD},
            {type: "application/ld+json", children: JSON_LD},
            {children: METRIKA},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function RootComponent() {
    useEffect(() => {
        installDomGuard();
        initInstallPrompt();
        installResilientFetch();
        if (import.meta.env.PROD && "serviceWorker" in navigator) {
            const register = () => {
                navigator.serviceWorker.register("/sw.js").catch(() => {});
            };
            if (document.readyState === "complete") register();
            else window.addEventListener("load", register, {once: true});
        }
        initExternalLinks();
    }, []);

    return (
        <RootDocument>
            <TooltipProvider>
                <Toaster/>
                <Sonner/>
                <Outlet/>
            </TooltipProvider>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru" translate="no">
        <head>
            <HeadContent/>
        </head>
        <body>
        <noscript>
            <div style={{position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, background: "#0d2a18", color: "#fff", fontFamily: "system-ui,sans-serif"}}>
                Для работы Лоок включите JavaScript в браузере.
            </div>
        </noscript>
        <div id="fallback-msg" style={{display: "none", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, background: "#0d2a18", color: "#fff", fontFamily: "system-ui,sans-serif"}}>
            <div style={{maxWidth: 480}}>
                <div style={{fontSize: 24, fontWeight: 700, marginBottom: 12}}>Лоок</div>
                <div style={{fontSize: 16, lineHeight: 1.5, opacity: 0.9}}>Похоже, ваш браузер устарел и не поддерживается. Откройте сайт на телефоне или компьютере в современном браузере (Chrome, Safari, Firefox).</div>
            </div>
        </div>
        <div id="root">
            {children}
        </div>
        <noscript>
            <div><img src="https://mc.yandex.ru/watch/101026698" style={{position: "absolute", left: -9999}} alt=""/></div>
        </noscript>
        <Scripts/>
        </body>
        </html>
    );
}
