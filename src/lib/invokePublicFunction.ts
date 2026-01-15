import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

export type PublicInvokeError = {
  message: string;
  status?: number;
};

export async function invokePublicFunction<T>(
  functionName: string,
  body: unknown
): Promise<{ data: T | null; error: PublicInvokeError | null }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as T) : (null as unknown as T);

    if (!res.ok) {
      return {
        data: null,
        error: {
          status: res.status,
          message:
            // @ts-expect-error - defensive: backend may return { error/message }
            (json?.error || json?.message || `HTTP ${res.status}`) as string,
        },
      };
    }

    return { data: json, error: null };
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Failed to fetch" },
    };
  }
}
