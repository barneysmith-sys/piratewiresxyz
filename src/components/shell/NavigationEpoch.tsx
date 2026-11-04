"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { launchStore } from "./launch";

/** Returning to the archive must not restore the search-launch shutter. */
export default function NavigationEpoch() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/") launchStore.set(null);
  }, [pathname]);
  return null;
}
