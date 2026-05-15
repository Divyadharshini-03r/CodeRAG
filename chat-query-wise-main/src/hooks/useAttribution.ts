import { useEffect, useState } from "react";

const KEY = "show-powered-by";

export function useAttribution() {
  const [showAttribution, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(KEY, String(showAttribution));
    window.dispatchEvent(new Event("attribution-changed"));
  }, [showAttribution]);

  useEffect(() => {
    const handler = () => {
      setShow(window.localStorage.getItem(KEY) === "true");
    };
    window.addEventListener("attribution-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("attribution-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { showAttribution, setShowAttribution: setShow };
}
