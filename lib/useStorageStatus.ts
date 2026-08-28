"use client";

import { useEffect, useState } from "react";
import { safeStorage, type StorageStatus } from "@/lib/safeStorage";

// Subscribes a component to safeStorage's live availability status, so a
// warning banner can appear the moment a write fails (not just on mount).
export function useStorageStatus(): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>(safeStorage.getStatus());

  useEffect(() => {
    // Re-sync in case status changed between render and effect (e.g. status
    // resolved on the client right after this component's initial render).
    setStatus(safeStorage.getStatus());
    return safeStorage.subscribe(setStatus);
  }, []);

  return status;
}
