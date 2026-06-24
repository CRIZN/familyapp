"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createDrizzleChildAppRepository } from "./repository";
import {
  clearChildSessionCookie,
  signInChildWithPin,
  writeChildSessionCookie,
} from "./session";

export type ChildSignInActionState = {
  message: string | null;
  status: "error" | "idle";
};

export async function signInChildAction(
  _previousState: ChildSignInActionState,
  formData: FormData,
): Promise<ChildSignInActionState> {
  const result = await signInChildWithPin(
    {
      repository: createDrizzleChildAppRepository(),
      sessionSecret: process.env.CHILD_SESSION_SECRET,
    },
    {
      childId: String(formData.get("childId") ?? ""),
      pin: String(formData.get("pin") ?? ""),
    },
  );

  if (result.status === "error") {
    return {
      message: result.message,
      status: "error",
    };
  }

  writeChildSessionCookie(await cookies(), result.cookieValue);
  revalidatePath("/child");
  redirect("/child");
}

export async function logoutChildAction(): Promise<void> {
  clearChildSessionCookie(await cookies());
  revalidatePath("/child");
  redirect("/child");
}
