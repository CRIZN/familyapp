import {
  archiveChore,
  createChore,
  pauseChore,
  type Routine,
} from "@/domain/chores";
import {
  createChildPinCredentials,
  type Household,
} from "@/domain/household";

import type { HouseholdRepository } from "./repository";

export type ParentManagementUser = {
  email: string | null | undefined;
  userId: string;
};

export type HouseholdManagementDependencies = {
  getAuthenticatedParent: () => Promise<ParentManagementUser | null>;
  repository: HouseholdRepository;
};

export type HouseholdManagementResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function createChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: {
    childId: string;
    dueDate: string;
    pointValue: number;
    routine: Routine | null;
    title: string;
  },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = createChore(authorization.household, input);
  const createdChore = updatedHousehold.chores.at(-1);
  if (!createdChore) {
    return { message: "Could not create Chore.", status: "error" };
  }

  const household = await dependencies.repository.createChore(
    authorization.household.id,
    createdChore,
  );

  return { household, message: "Chore created.", status: "ok" };
}

export async function addAllowedParent(
  dependencies: HouseholdManagementDependencies,
  input: { email: string; name: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) {
    return { message: "Enter the Parent name.", status: "error" };
  }
  if (!email || !email.includes("@")) {
    return { message: "Enter the Parent email address.", status: "error" };
  }

  const household = await dependencies.repository.addAllowedParent(
    authorization.household.id,
    { email, name },
  );

  return { household, message: "Parent added.", status: "ok" };
}

export async function updateChildProfile(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; name: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const name = input.name.trim();
  if (!name) {
    return { message: "Enter the Child name.", status: "error" };
  }

  const household = await dependencies.repository.updateChildProfile(
    authorization.household.id,
    input.childId,
    { name },
  );

  return { household, message: "Child profile updated.", status: "ok" };
}

export async function updateChildPinForParent(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; pin: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const credentials = await createChildPinCredentials(input.pin);
  const household = await dependencies.repository.updateChildPin(
    authorization.household.id,
    input.childId,
    credentials,
  );

  return { household, message: "Child PIN updated.", status: "ok" };
}

export async function saveCalendarConnectionForParent(
  dependencies: HouseholdManagementDependencies,
  input: { calendarName: string; feedUrl: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const calendarName = input.calendarName.trim();
  if (!calendarName) {
    return { message: "Name the Apple Family Calendar.", status: "error" };
  }

  const feedUrl = normalizeCalendarFeedUrl(input.feedUrl);
  if (!feedUrl) {
    return {
      message: "Enter a valid webcal, http, or https Calendar feed URL.",
      status: "error",
    };
  }

  const household = await dependencies.repository.saveCalendarConnection(
    authorization.household.id,
    {
      calendarName,
      publicFeedUrl: feedUrl,
    },
  );

  return { household, message: "Apple Family Calendar connected.", status: "ok" };
}

export async function pauseChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: { choreId: string },
): Promise<HouseholdManagementResult> {
  return updateParentChoreStatus(dependencies, input.choreId, pauseChore, "Chore paused.");
}

export async function archiveChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: { choreId: string },
): Promise<HouseholdManagementResult> {
  return updateParentChoreStatus(
    dependencies,
    input.choreId,
    archiveChore,
    "Chore archived.",
  );
}

async function updateParentChoreStatus(
  dependencies: HouseholdManagementDependencies,
  choreId: string,
  update: (household: Household, choreId: string) => Household,
  message: string,
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = update(authorization.household, choreId);
  const updatedChore = updatedHousehold.chores.find((chore) => chore.id === choreId);
  if (!updatedChore) {
    return { message: "Chore not found.", status: "error" };
  }

  const household = await dependencies.repository.updateChoreStatus(
    authorization.household.id,
    choreId,
    { status: updatedChore.status },
  );

  return { household, message, status: "ok" };
}

async function authorizeParent(
  dependencies: HouseholdManagementDependencies,
): Promise<
  | { household: Household; status: "ok" }
  | { message: string; status: "error" }
> {
  const parent = await dependencies.getAuthenticatedParent();
  const email = normalizeEmail(parent?.email);

  if (!parent || !email) {
    return {
      message: "Sign in with an allowed Parent email.",
      status: "error",
    };
  }

  const household = await dependencies.repository.findHouseholdForParent(
    email,
    parent.userId,
  );

  if (!household) {
    return {
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    };
  }

  return { household, status: "ok" };
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeCalendarFeedUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    return ["webcal:", "http:", "https:"].includes(parsed.protocol)
      ? trimmed
      : null;
  } catch {
    return null;
  }
}
