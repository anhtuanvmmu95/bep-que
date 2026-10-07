"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

// Official Cloudflare Always-Pass Test Sitekey
const DEFAULT_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (errorCode?: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  action?: string;
  className?: string;
}

export interface TurnstileWidgetRef {
  reset: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (code?: string) => void;
          "expired-callback"?: () => void;
          theme?: string;
          size?: string;
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  (
    {
      onVerify,
      onError,
      onExpire,
      theme = "light",
      size = "flexible",
      action,
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      // 1. Kiểm tra môi trường test
      if (
        process.env.NODE_ENV === "test" ||
        process.env.NEXT_PUBLIC_SKIP_BOT_VERIFICATION === "true"
      ) {
        onVerify("test-mock-token-pass");
        return;
      }

      // 2. Tải Turnstile Script nếu chưa có
      const scriptId = "cf-turnstile-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const initWidget = () => {
        if (
          !containerRef.current ||
          !window.turnstile ||
          widgetIdRef.current !== null
        ) {
          return;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token);
            },
            "error-callback": (err) => {
              if (onError) onError(err);
            },
            "expired-callback": () => {
              if (onExpire) onExpire();
            },
            theme,
            size,
            action,
          });
          widgetIdRef.current = id;
          setIsLoaded(true);
        } catch (e) {
          console.warn("Turnstile render warning:", e);
        }
      };

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initWidget();
        };
        document.head.appendChild(script);
      } else if (window.turnstile) {
        initWidget();
      } else {
        script.addEventListener("load", initWidget);
      }

      return () => {
        if (
          typeof window !== "undefined" &&
          window.turnstile &&
          widgetIdRef.current
        ) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme, size, action, onVerify, onError, onExpire]);

    return (
      <div className={`turnstile-container my-2 ${className}`}>
        <div ref={containerRef} className="flex justify-center" />
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
