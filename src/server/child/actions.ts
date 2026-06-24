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
import { submitChoreForChild, type ChildChoreResult } from "./chores";
import { submitProgressCheckInForChild, type ChildGoalResult } from "./goals";
import { getCurrentChildSession } from "./queries";

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

export async function submitChildChoreAction(input: {
  choreId: string;
  occurrenceDate: string;
}): Promise<ChildChoreResult> {
  try {
    const result = await submitChoreForChild(
      {
        getAuthenticatedChild: getCurrentChildSession,
        repository: createDrizzleChildAppRepository(),
      },
      input,
    );

    if (result.status === "ok") {
      revalidatePath("/child");
      revalidatePath("/parent");
      revalidatePath("/parent/approvals");
    }

    return result;
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Could not submit Chore.",
      status: "error",
    };
  }
}

export async function submitChildProgressCheckInAction(input: {
  goalId: string;
}): Promise<ChildGoalResult> {
  try {
    const result = await submitProgressCheckInForChild(
      {
        getAuthenticatedChild: getCurrentChildSession,
        repository: createDrizzleChildAppRepository(),
      },
      input,
    );

    if (result.status === "ok") {
      revalidatePath("/child");
      revalidatePath("/parent");
      revalidatePath("/parent/approvals");
      revalidatePath("/parent/goals");
    }

    return result;
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not submit Progress Check-in.",
      status: "error",
    };
  }
}
