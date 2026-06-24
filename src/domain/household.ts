import type { Chore, ChoreSubmission, SkippedChoreOccurrence } from "./chores";
import type {
  CalendarConnection,
  EventEnrichment,
  FamilyCalendarEvent,
} from "./calendar";
import type { Goal, ProgressCheckIn } from "./goals";
import type { Reward, RewardContribution, RewardRequest } from "./rewards";

export type ParentProfile = {
  id: string;
  name: string;
  email: string;
};

export type ChildProfile = {
  id: string;
  name: string;
  pinHash: string;
  pinSalt: string;
  pointBalance: number;
  sessionVersion?: number;
};

export type PointLedgerEntry = {
  id: string;
  childId: string;
  delta: number;
  description: string;
  sourceType:
    | "chore_approval"
    | "progress_check_in_approval"
    | "goal_completion"
    | "reward_contribution"
    | "reward_contribution_return"
    | "reward_request_reservation"
    | "reward_request_approval_spend"
    | "reward_request_return"
    | "bonus_points"
    | "point_adjustment";
  sourceId: string;
  createdAt: string;
};

export type ChildWin = {
  id: string;
  childId: string;
  title: string;
  description: string;
  sourceType: "chore" | "progress_check_in" | "goal" | "reward";
  sourceId: string;
  earnedAt: string;
};

export type Household = {
  id: string;
  name: string;
  parents: ParentProfile[];
  children: ChildProfile[];
  chores: Chore[];
  choreSubmissions: ChoreSubmission[];
  skippedChoreOccurrences: SkippedChoreOccurrence[];
  goals: Goal[];
  progressCheckIns: ProgressCheckIn[];
  rewards: Reward[];
  rewardContributions: RewardContribution[];
  rewardRequests: RewardRequest[];
  calendarConnection: CalendarConnection | null;
  calendarEvents: FamilyCalendarEvent[];
  eventEnrichments: EventEnrichment[];
  pointLedger: PointLedgerEntry[];
  childWins: ChildWin[];
  createdAt: string;
  updatedAt: string;
};

export type ChildSession = {
  householdId: string;
  childId: string;
  childName: string;
  startedAt: string;
};

export type CreateHouseholdInput = {
  householdName: string;
  parents: Array<{ name: string; email: string }>;
  children: Array<{ name: string; pin: string }>;
};

const PIN_PATTERN = /^\d{4,8}$/;

export async function createHousehold(
  input: CreateHouseholdInput,
): Promise<Household> {
  const householdName = input.householdName.trim();
  if (!householdName) {
    throw new Error("Name the Household.");
  }

  const parents = input.parents
    .map((parent) => ({
      name: parent.name.trim(),
      email: parent.email.trim().toLowerCase(),
    }))
    .filter((parent) => parent.name || parent.email);

  if (parents.length === 0) {
    throw new Error("Add at least one Parent.");
  }
  for (const parent of parents) {
    if (!parent.name) {
      throw new Error("Each Parent needs a name.");
    }
    if (!parent.email || !parent.email.includes("@")) {
      throw new Error("Each Parent needs an email address.");
    }
  }

  const children = input.children
    .map((child) => ({
      name: child.name.trim(),
      pin: child.pin.trim(),
    }))
    .filter((child) => child.name || child.pin);

  if (children.length === 0) {
    throw new Error("Add at least one Child.");
  }
  for (const child of children) {
    if (!child.name) {
      throw new Error("Each Child needs a name.");
    }
    assertValidPin(child.pin);
  }

  const now = new Date().toISOString();
  return {
    id: createId(),
    name: householdName,
    parents: parents.map((parent) => ({
      id: createId(),
      name: parent.name,
      email: parent.email,
    })),
    children: await Promise.all(
      children.map(async (child) => {
        const pinSalt = createPinSalt();
        return {
          id: createId(),
          name: child.name,
          pinHash: await hashChildPin(child.pin, pinSalt),
          pinSalt,
          pointBalance: 0,
        };
      }),
    ),
    chores: [],
    choreSubmissions: [],
    skippedChoreOccurrences: [],
    goals: [],
    progressCheckIns: [],
    rewards: [],
    rewardContributions: [],
    rewardRequests: [],
    calendarConnection: null,
    calendarEvents: [],
    eventEnrichments: [],
    pointLedger: [],
    childWins: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateChildPin(
  household: Household,
  childId: string,
  pin: string,
): Promise<Household> {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }

  const { pinHash, pinSalt } = await createChildPinCredentials(pin);

  return {
    ...household,
    children: household.children.map((candidate) =>
      candidate.id === childId
        ? {
            ...candidate,
            pinHash,
            pinSalt,
          }
        : candidate,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export async function createChildPinCredentials(pin: string): Promise<{
  pinHash: string;
  pinSalt: string;
}> {
  assertValidPin(pin);
  const pinSalt = createPinSalt();

  return {
    pinHash: await hashChildPin(pin, pinSalt),
    pinSalt,
  };
}

export async function startChildSession(
  household: Household,
  childId: string,
  pin: string,
): Promise<ChildSession> {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }

  const pinHash = await hashChildPin(pin, child.pinSalt);
  if (pinHash !== child.pinHash) {
    throw new Error("That PIN does not match this Child.");
  }

  return {
    householdId: household.id,
    childId: child.id,
    childName: child.name,
    startedAt: new Date().toISOString(),
  };
}

export function getChildView(
  household: Household,
  childId: string,
): {
  householdName: string;
  child: Pick<ChildProfile, "id" | "name" | "pointBalance">;
} {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }

  return {
    householdName: household.name,
    child: {
      id: child.id,
      name: child.name,
      pointBalance: child.pointBalance,
    },
  };
}

function assertValidPin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("Child PINs must be 4 to 8 digits.");
  }
}

async function hashChildPin(pin: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createPinSalt(): string {
  return createId();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
