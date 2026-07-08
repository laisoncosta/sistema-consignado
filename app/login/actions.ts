"use server";

import { redirect } from "next/navigation";

import { authenticateUser } from "@/lib/authenticate-user";
import { hydrateSessionUser } from "@/lib/resolve-session-user-id";
import { setSession } from "@/lib/session";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData,
): Promise<LoginState | null> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const result = await authenticateUser(email, senha);

  if (!result.ok) {
    return { error: result.error };
  }

  await setSession(await hydrateSessionUser(result.user));
  redirect(result.redirectTo);
}
