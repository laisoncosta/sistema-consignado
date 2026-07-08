"use client";

import { useEffect } from "react";

function hostNgrok(hostname: string): boolean {
  return /ngrok/i.test(hostname);
}

export function NgrokClientSupport() {
  useEffect(() => {
    if (!hostNgrok(window.location.hostname)) {
      return;
    }

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = (input, init) => {
      const headers = new Headers(init?.headers);

      if (!headers.has("ngrok-skip-browser-warning")) {
        headers.set("ngrok-skip-browser-warning", "true");
      }

      return fetchOriginal(input, {
        ...init,
        headers,
      });
    };

    return () => {
      window.fetch = fetchOriginal;
    };
  }, []);

  return null;
}
