/**
 * use-tenant.ts
 * Provides the current tenant ID from secure storage (set at login).
 * Returns null when in demo/unauthenticated mode.
 */
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const TENANT_KEY = "nvc360_tenant_id";
const USER_KEY = "nvc360_user";

export interface TenantContext {
  tenantId: number | null;
  userId: number | null;
  isDemo: boolean;
  loading: boolean;
}

export function useTenant(): TenantContext {
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (Platform.OS === "web") {
          const raw = typeof localStorage !== "undefined" ? localStorage.getItem(USER_KEY) : null;
          if (raw) {
            const parsed = JSON.parse(raw);
            const tid = parsed?.tenantId ? parseInt(String(parsed.tenantId), 10) : null;
            const uid = parsed?.id ? parseInt(String(parsed.id), 10) : null;
            setTenantId(isNaN(tid as number) ? null : tid);
            setUserId(isNaN(uid as number) ? null : uid);
          }
        } else {
          // Native: read from SecureStore
          const { default: SecureStore } = await import("expo-secure-store");
          const raw = await SecureStore.getItemAsync(USER_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const tid = parsed?.tenantId ? parseInt(String(parsed.tenantId), 10) : null;
            const uid = parsed?.id ? parseInt(String(parsed.id), 10) : null;
            setTenantId(isNaN(tid as number) ? null : tid);
            setUserId(isNaN(uid as number) ? null : uid);
          }
        }
      } catch {
        // Silently fail — demo mode
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return {
    tenantId,
    userId,
    isDemo: tenantId === null,
    loading,
  };
}
