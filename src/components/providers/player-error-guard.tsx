"use client";

import { useEffect } from "react";

function isStalePlayerPostMessageError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";

  return message.includes("Cannot read properties of null") && message.includes("postMessage");
}

export function PlayerErrorGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isStalePlayerPostMessageError(event.error ?? event.message)) {
        event.preventDefault();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isStalePlayerPostMessageError(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
