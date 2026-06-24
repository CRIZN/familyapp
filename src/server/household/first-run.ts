import { createHousehold, type Household } from "@/domain/household";

import type { HouseholdRepository } from "./repository";

export type FirstRunParent = {
  email: string | null | undefined;
  userId: string;
};

export type FirstRunSetupInput = {
  childDrafts: Array<{ name: string; pin: string }>;
  householdName: string;
  parentName: string;
  setupToken: string;
};

export type FirstRunSetupResult =
  | { household: Household; status: "created" }
  | { message: string; status: "error" };

export type FirstRunSetupDependencies = {
  env: { FIRST_RUN_SETUP_TOKEN?: string };
  getAuthenticatedParent: () => Promise<FirstRunParent | null>;
  repository: HouseholdRepository;
};

export async function createFirstRunHousehold(
  dependencies: FirstRunSetupDependencies,
  input: FirstRunSetupInput,
): Promise<FirstRunSetupResult> {
  const parent = await dependencies.getAuthenticatedParent();
  const parentEmail = normalizeEmail(parent?.email);

  if (!parent || !parentEmail) {
    return {
      message: "Sign in with the first Parent email before setup.",
      status: "error",
    };
  }

  const expectedToken = dependencies.env.FIRST_RUN_SETUP_TOKEN?.trim();
  if (!expectedToken || input.setupToken.trim() !== expectedToken) {
    return {
      message: "The setup token does not match.",
      status: "error",
    };
  }

  if (await dependencies.repository.hasAnyHousehold()) {
    return {
      message: "Household setup is already complete.",
      status: "error",
    };
  }

  const household = await createHousehold({
    children: input.childDrafts,
    householdName: input.householdName,
    parents: [
      {
        email: parentEmail,
        name: input.parentName.trim() || parentEmail,
      },
    ],
  });

  await dependencies.repository.createFirstRunHousehold(household, parent.userId);

  return { household, status: "created" };
}

export function readFirstRunSetupInput(formData: FormData): FirstRunSetupInput {
  const childCount = Number(formData.get("childCount") ?? 0);
  const childDrafts = Array.from({ length: childCount }, (_, index) => ({
    name: String(formData.get(`child-${index}-name`) ?? ""),
    pin: String(formData.get(`child-${index}-pin`) ?? ""),
  }));

  return {
    childDrafts,
    householdName: String(formData.get("householdName") ?? ""),
    parentName: String(formData.get("parentName") ?? ""),
    setupToken: String(formData.get("setupToken") ?? ""),
  };
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
