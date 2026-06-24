export type ParentAppGate =
  | { status: "allowed"; email: string; userId: string }
  | { status: "first_run"; email: string; userId: string }
  | { status: "denied" }
  | { status: "locked" };

export type ParentGateUser = {
  email?: string | null;
  id: string;
};

type ParentGateDependencies = {
  getUser: () => Promise<ParentGateUser | null>;
  hasAnyHousehold: () => Promise<boolean>;
  isParentAllowlisted: (email: string, userId: string) => Promise<boolean>;
};

export async function resolveParentAppGate(
  dependencies: ParentGateDependencies,
): Promise<ParentAppGate> {
  let user: ParentGateUser | null;

  try {
    user = await dependencies.getUser();
  } catch {
    return { status: "locked" };
  }

  if (!user) {
    return { status: "locked" };
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return { status: "denied" };
  }

  let isAllowlisted = false;
  try {
    isAllowlisted = await dependencies.isParentAllowlisted(email, user.id);
  } catch {
    isAllowlisted = false;
  }

  if (isAllowlisted) {
    return { email, status: "allowed", userId: user.id };
  }

  let hasAnyHousehold = true;
  try {
    hasAnyHousehold = await dependencies.hasAnyHousehold();
  } catch {
    hasAnyHousehold = true;
  }

  if (!hasAnyHousehold) {
    return { email, status: "first_run", userId: user.id };
  }

  if (!isAllowlisted) {
    return { status: "denied" };
  }

  return { status: "denied" };
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
