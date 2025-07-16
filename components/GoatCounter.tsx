"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GoatCounter() {
  const pathname = usePathname();

  useEffect(() => {
    // Call goatcounter.count() if the script is loaded
    if (typeof window !== "undefined" && (window as any).goatcounter?.count) {
      (window as any).goatcounter.count();
    }
  }, [pathname]);

  // This component renders nothing visible
  return null;
}
