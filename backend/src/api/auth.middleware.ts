import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types.ts";
import type { UUID } from "../types/primitives.ts";

export interface AuthenticatedContext {
  userId: UUID;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim();
}

/**
 * Валидирует JWT-токен пользователя через Supabase Auth
 */
export async function authenticateRequest(
  req: Request,
  authClient: SupabaseClient<Database>,
): Promise<AuthenticatedContext | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;

  return { userId: user.id as UUID };
}