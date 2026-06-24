"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gift,
  Flag,
  ListChecks,
  KeyRound,
  LogOut,
  Sparkles,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";

import { getChildAgenda } from "@/domain/calendar";
import type { ChoreOccurrence } from "@/domain/chores";
import {
  getChildChoreBoard,
  getChildPointLedger,
  getChildWins,
} from "@/domain/chores";
import type { GoalProgress, ProgressCheckInSummary } from "@/domain/goals";
import { getChildGoalBoard } from "@/domain/goals";
import {
  getChildView,
  type Household,
} from "@/domain/household";
import { getPointLedgerDisplay } from "@/domain/points";
import type {
  ChildRewardCatalogItem,
  RewardContributionSummary,
  RewardRequestSummary,
} from "@/domain/rewards";
import {
  cancelRewardRequest,
  contributeToReward,
  getChildRewardBoard,
  requestReward,
  returnRewardContribution,
} from "@/domain/rewards";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  logoutChildAction,
  signInChildAction,
  submitChildChoreAction,
  submitChildProgressCheckInAction,
  type ChildSignInActionState,
} from "@/server/child/actions";

type ChildViewSession = {
  childId: string;
  householdId: string;
  sessionVersion: number;
};

type ChildSignInOptions = {
  children: Array<{ id: string; name: string }>;
  householdId: string;
};

const initialSignInState: ChildSignInActionState = {
  message: null,
  status: "idle",
};

export function ChildViewPage({
  initialHousehold,
  initialSession,
  signInOptions,
}: {
  initialHousehold: Household | null;
  initialSession: ChildViewSession | null;
  signInOptions: ChildSignInOptions | null;
}) {
  const [household, setHousehold] = useState<Household | null>(initialHousehold);
  const [signInState, formAction, isSigningIn] = useActionState(
    signInChildAction,
    initialSignInState,
  );
  const session = initialSession;
  const [selectedChildId, setSelectedChildId] = useState(
    signInOptions?.children[0]?.id ?? "",
  );
  const [pin, setPin] = useState("");
  const [rewardContributionDrafts, setRewardContributionDrafts] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submittingChoreKey, setSubmittingChoreKey] = useState<string | null>(
    null,
  );

  if (!session || !household) {
    if (!signInOptions || signInOptions.children.length === 0) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-md border border-border bg-background p-6 shadow-panel">
            <UserRound aria-hidden="true" className="mb-4 h-9 w-9 text-child" />
            <h1 className="text-2xl font-semibold">Child View</h1>
            <p className="mt-2 text-muted-foreground">
              A Parent needs to create the Household before Children can enter.
            </p>
            <Link
              className={buttonVariants({ className: "mt-5", variant: "parent" })}
              href="/setup"
            >
              Start Household Setup
            </Link>
          </div>
        </div>
      );
    }

    return (
      <form action={formAction} className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <KeyRound aria-hidden="true" className="mb-4 h-9 w-9 text-child" />
          <h1 className="text-2xl font-semibold">Enter Child View</h1>
          <p className="mt-2 text-muted-foreground">
            Choose your profile and enter your Child PIN.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_12rem_auto]">
            <div>
              <Label htmlFor="child">Child</Label>
              <select
                className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="child"
                name="childId"
                value={selectedChildId || signInOptions.children[0]?.id || ""}
                onChange={(event) => setSelectedChildId(event.target.value)}
              >
                {signInOptions.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pin">Child PIN</Label>
              <Input
                className="mt-2"
                id="pin"
                inputMode="numeric"
                maxLength={8}
                name="pin"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </div>
            <Button
              className="self-end"
              disabled={isSigningIn}
              type="submit"
              variant="child"
            >
              Enter
            </Button>
          </div>

          {signInState.status === "error" && signInState.message ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {signInState.message}
            </p>
          ) : null}
        </div>
      </form>
    );
  }

  {
    const view = getChildView(household, session.childId);
    const choreBoard = getChildChoreBoard(
      household,
      session.childId,
      getTodayDateKey(),
    );
    const goalBoard = getChildGoalBoard(household, session.childId);
    const rewardBoard = getChildRewardBoard(household, session.childId);
    const pointLedger = getChildPointLedger(household, session.childId);
    const wins = getChildWins(household, session.childId);
    const childAgenda = getChildAgenda(household, session.childId);
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-child">
              Child View
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Hi, {view.child.name}
            </h1>
            <p className="mt-2 text-muted-foreground">{view.householdName}</p>
          </div>
          <form action={logoutChildAction}>
            <Button type="submit" variant="outline">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Leave Child View
            </Button>
          </form>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <Sparkles aria-hidden="true" className="mb-4 h-7 w-7 text-child" />
            <p className="text-sm font-medium text-muted-foreground">
              Point Balance
            </p>
            <p className="mt-2 text-4xl font-semibold">
              {view.child.pointBalance}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-panel sm:col-span-2">
            <h2 className="text-lg font-semibold">Today</h2>
            {choreBoard.today.length === 0 && choreBoard.overdue.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
                  title="No Chores due right now."
                  detail="New due and Overdue Chores will show here first."
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {choreBoard.overdue.map((chore) => (
                <ChoreCard
                  chore={chore}
                  key={`${chore.choreId}-${chore.dueDate}`}
                  tone="overdue"
                  isSubmitting={
                    submittingChoreKey === `${chore.choreId}:${chore.dueDate}`
                  }
                  onSubmit={() => submitDueChore(chore)}
                />
              ))}
              {choreBoard.today.map((chore) => (
                <ChoreCard
                  chore={chore}
                  key={`${chore.choreId}-${chore.dueDate}`}
                  tone="today"
                  isSubmitting={
                    submittingChoreKey === `${chore.choreId}:${chore.dueDate}`
                  }
                  onSubmit={() => submitDueChore(chore)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-child" />
            <h2 className="text-lg font-semibold">Agenda</h2>
          </div>
          {childAgenda.length === 0 ? (
            <EmptyState
              icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
              title="No Events on your Agenda."
              detail="Events marked for you or all Household will appear here."
            />
          ) : (
            <div className="space-y-4">
              {childAgenda.map((day) => (
                <div className="space-y-3" key={day.date}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {formatDate(day.date)}
                  </h3>
                  {day.events.map((event) => (
                    <div
                      className="rounded-md border border-blue-200 bg-blue-50 p-3"
                      key={event.eventId}
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
                        {event.location ? ` - ${event.location}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Flag aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Goals</h2>
            </div>
            {goalBoard.active.length === 0 ? (
              <EmptyState
                icon={<Flag aria-hidden="true" className="h-5 w-5" />}
                title="No active Goals yet."
                detail="When a Parent creates a Goal, you can send Progress Check-ins here."
              />
            ) : (
              <div className="space-y-3">
                {goalBoard.active.map((goal) => (
                  <GoalCard
                    goal={goal}
                    key={goal.goalId}
                    onSubmit={() => submitGoalProgress(goal)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Gift aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Rewards</h2>
            </div>
            {rewardBoard.catalog.length === 0 ? (
              <EmptyState
                icon={<Gift aria-hidden="true" className="h-5 w-5" />}
                title="No Rewards yet."
                detail="Rewards from the shared catalog will appear here when they are ready."
              />
            ) : (
              <div className="space-y-3">
                {rewardBoard.catalog.map((reward) => (
                  <RewardCard
                    key={reward.rewardId}
                    reward={reward}
                    contributionDraft={
                      rewardContributionDrafts[reward.rewardId] ?? ""
                    }
                    onContributionDraftChange={(value) =>
                      setRewardContributionDrafts({
                        ...rewardContributionDrafts,
                        [reward.rewardId]: value,
                      })
                    }
                    onContribute={() => contributePointsToReward(reward)}
                    onRequest={() => submitRewardRequest(reward)}
                  />
                ))}
              </div>
            )}
          </div>

          {rewardBoard.activeContributions.length > 0 ? (
            <div className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Gift aria-hidden="true" className="h-5 w-5 text-child" />
                <h2 className="text-lg font-semibold">Saved for Rewards</h2>
              </div>
              <div className="space-y-3">
                {rewardBoard.activeContributions.map((contribution) => (
                  <RewardContributionCard
                    contribution={contribution}
                    key={contribution.contributionId}
                    onReturn={() => returnContribution(contribution)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 aria-hidden="true" className="h-5 w-5 text-parent" />
              <h2 className="text-lg font-semibold">Waiting for Parent</h2>
            </div>
            {choreBoard.pendingReview.length === 0 &&
            goalBoard.pendingReview.length === 0 &&
            rewardBoard.pendingRequests.length === 0 ? (
              <EmptyState
                icon={<Clock3 aria-hidden="true" className="h-5 w-5" />}
                title="Nothing is waiting for a Parent."
                detail="Submitted Chores, Progress Check-ins, and Reward Requests will stay here while pending."
              />
            ) : (
              <div className="space-y-3">
                {choreBoard.pendingReview.map((chore) => (
                  <ChoreCard
                    chore={chore}
                    key={`${chore.choreId}-${chore.dueDate}`}
                    tone="pending"
                  />
                ))}
                {goalBoard.pendingReview.map((checkIn) => (
                  <ProgressCheckInCard
                    checkIn={checkIn}
                    key={checkIn.checkInId}
                    tone="pending"
                  />
                ))}
                {rewardBoard.pendingRequests.map((request) => (
                  <RewardRequestCard
                    key={request.requestId}
                    request={request}
                    tone="pending"
                    onCancel={() => cancelPendingRewardRequest(request)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Upcoming</h2>
            </div>
            {choreBoard.upcoming.length === 0 ? (
              <EmptyState
                icon={<ListChecks aria-hidden="true" className="h-5 w-5" />}
                title="No upcoming Chores."
                detail="Chores coming soon will appear here after today's work."
              />
            ) : (
              <div className="space-y-3">
                {choreBoard.upcoming.map((chore) => (
                  <ChoreCard
                    chore={chore}
                    key={`${chore.choreId}-${chore.dueDate}`}
                    tone="upcoming"
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {rewardBoard.approvedRequests.length > 0 ? (
          <section className="mt-4 rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Gift aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Approved Rewards</h2>
            </div>
            <div className="space-y-3">
              {rewardBoard.approvedRequests.map((request) => (
                <RewardRequestCard
                  key={request.requestId}
                  request={request}
                  tone="approved"
                />
              ))}
            </div>
          </section>
        ) : null}

        {rewardBoard.fulfilledRequests.length > 0 ? (
          <section className="mt-4 rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Gift aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Fulfilled Rewards</h2>
            </div>
            <div className="space-y-3">
              {rewardBoard.fulfilledRequests.map((request) => (
                <RewardRequestCard
                  key={request.requestId}
                  request={request}
                  tone="fulfilled"
                />
              ))}
            </div>
          </section>
        ) : null}

        {goalBoard.needsWork.length > 0 ? (
          <section className="mt-4 rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <XCircle aria-hidden="true" className="h-5 w-5 text-parent" />
              <h2 className="text-lg font-semibold">Needs Work</h2>
            </div>
            <div className="space-y-3">
              {goalBoard.needsWork.map((checkIn) => (
                <ProgressCheckInCard
                  checkIn={checkIn}
                  key={checkIn.checkInId}
                  tone="needs_work"
                  onSubmit={() => resubmitGoalProgress(checkIn)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Point Ledger</h2>
            </div>
            {pointLedger.length === 0 ? (
              <EmptyState
                icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
                title="No Point changes yet."
                detail="Approved work, Rewards, Bonus Points, and corrections will explain each change."
              />
            ) : (
              <div className="space-y-3">
                {pointLedger.map((entry) => {
                  const display = getPointLedgerDisplay(entry);
                  return (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center"
                      key={entry.id}
                    >
                      <div>
                        <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                          {display.label}
                        </span>
                        <p className="mt-2 font-medium">
                          {display.explanation}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(entry.createdAt.slice(0, 10))}
                        </p>
                      </div>
                      <span
                        className={`self-start rounded-md px-2 py-1 text-sm font-semibold sm:self-center ${getDeltaClass(entry.delta)}`}
                      >
                        {formatPointDelta(entry.delta)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-background p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Trophy aria-hidden="true" className="h-5 w-5 text-child" />
              <h2 className="text-lg font-semibold">Wins</h2>
            </div>
            {wins.length === 0 ? (
              <EmptyState
                icon={<Trophy aria-hidden="true" className="h-5 w-5" />}
                title="No Wins yet."
                detail="Approved Chores, progress, completed Goals, and fulfilled Rewards will become Wins."
              />
            ) : (
              <div className="space-y-3">
                {wins.map((win) => (
                  <div
                    className="rounded-md border border-emerald-200 bg-emerald-50 p-3"
                    key={win.id}
                  >
                    <div className="flex items-start gap-3">
                      <Trophy
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-emerald-700"
                      />
                      <div>
                        <p className="font-medium">{win.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {win.description} -{" "}
                          {formatDate(win.earnedAt.slice(0, 10))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {message ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  async function submitDueChore(chore: ChoreOccurrence) {
    if (!household || !session) {
      return;
    }
    setError(null);
    setMessage(null);
    const choreKey = `${chore.choreId}:${chore.dueDate}`;
    setSubmittingChoreKey(choreKey);
    try {
      const result = await submitChildChoreAction({
        choreId: chore.choreId,
        occurrenceDate: chore.dueDate,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setHousehold(result.household);
      setMessage(`${chore.title} is waiting for Parent review.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit Chore.");
    } finally {
      setSubmittingChoreKey(null);
    }
  }

  async function submitGoalProgress(goal: GoalProgress) {
    if (!household || !session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const result = await submitChildProgressCheckInAction({
        goalId: goal.goalId,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setHousehold(result.household);
      setMessage(`${goal.title} Progress Check-in is waiting for Parent review.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not submit Progress Check-in.",
      );
    }
  }

  function resubmitGoalProgress(checkIn: ProgressCheckInSummary) {
    submitGoalProgress({
      goalId: checkIn.goalId,
      childId: checkIn.childId,
      title: checkIn.title,
      pointValue: 0,
      awardedPoints: 0,
      remainingPoints: 0,
      status: "active",
    });
  }

  function contributePointsToReward(reward: ChildRewardCatalogItem) {
    if (!household || !session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = contributeToReward(household, {
        childId: session.childId,
        rewardId: reward.rewardId,
        points: Number(rewardContributionDrafts[reward.rewardId] ?? "0"),
      });
      setHousehold(updated);
      setRewardContributionDrafts({
        ...rewardContributionDrafts,
        [reward.rewardId]: "",
      });
      setMessage(`${reward.title} has saved Points.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not contribute to Reward.",
      );
    }
  }

  function returnContribution(contribution: RewardContributionSummary) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      setHousehold(
        returnRewardContribution(household, contribution.contributionId),
      );
      setMessage(`${contribution.title} Points returned.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not return Reward Contribution.",
      );
    }
  }

  function submitRewardRequest(reward: ChildRewardCatalogItem) {
    if (!household || !session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = requestReward(household, {
        childId: session.childId,
        rewardId: reward.rewardId,
      });
      setHousehold(updated);
      setMessage(`${reward.title} is waiting for Parent review.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not request Reward.",
      );
    }
  }

  function cancelPendingRewardRequest(request: RewardRequestSummary) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      setHousehold(cancelRewardRequest(household, request.requestId));
      setMessage(`${request.title} request canceled.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not cancel request.",
      );
    }
  }

}

function ChoreCard({
  isSubmitting = false,
  chore,
  tone,
  onSubmit,
}: {
  isSubmitting?: boolean;
  chore: ChoreOccurrence;
  tone: "overdue" | "today" | "pending" | "upcoming";
  onSubmit?: () => void;
}) {
  const toneClass =
    tone === "overdue"
      ? "border-red-200 bg-red-50"
      : tone === "pending"
        ? "border-blue-200 bg-blue-50"
        : "border-border bg-background";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{chore.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(chore.dueDate)} - {chore.pointValue} Points -{" "}
            {chore.routineLabel}
          </p>
        </div>
        {onSubmit ? (
          <Button
            disabled={isSubmitting}
            type="button"
            variant="child"
            onClick={onSubmit}
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {isSubmitting ? "Submitting" : "Submit"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onSubmit,
}: {
  goal: GoalProgress;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{goal.title}</p>
          <p className="text-sm text-muted-foreground">
            {goal.awardedPoints} of {goal.pointValue} Points earned -{" "}
            {goal.remainingPoints} remaining
          </p>
        </div>
        <Button
          type="button"
          variant="child"
          onClick={onSubmit}
          disabled={goal.remainingPoints === 0}
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Check in
        </Button>
      </div>
    </div>
  );
}

function RewardCard({
  reward,
  contributionDraft,
  onContributionDraftChange,
  onContribute,
  onRequest,
}: {
  reward: ChildRewardCatalogItem;
  contributionDraft: string;
  onContributionDraftChange: (value: string) => void;
  onContribute: () => void;
  onRequest: () => void;
}) {
  return (
    <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_8rem_auto_auto] lg:items-end">
        <div>
          <p className="font-medium">{reward.title}</p>
          <p className="text-sm text-muted-foreground">
            {reward.contributedPoints} of {reward.pointCost} Points saved -{" "}
            {reward.remainingPoints} remaining
          </p>
          <div
            aria-label={`${reward.contributedPoints} of ${reward.pointCost} Points saved`}
            aria-valuemax={reward.pointCost}
            aria-valuemin={0}
            aria-valuenow={reward.contributedPoints}
            className="mt-3 h-2 overflow-hidden rounded-full bg-background"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-child"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (reward.contributedPoints / reward.pointCost) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${reward.rewardId}-contribution`}>Points</Label>
          <Input
            className="mt-2"
            id={`${reward.rewardId}-contribution`}
            min={1}
            type="number"
            value={contributionDraft}
            onChange={(event) => onContributionDraftChange(event.target.value)}
          />
        </div>
        <Button type="button" variant="child" onClick={onContribute}>
          <Gift aria-hidden="true" className="h-4 w-4" />
          Save
        </Button>
        <Button type="button" variant="child" onClick={onRequest}>
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Request
        </Button>
      </div>
    </div>
  );
}

function RewardContributionCard({
  contribution,
  onReturn,
}: {
  contribution: RewardContributionSummary;
  onReturn: () => void;
}) {
  return (
    <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{contribution.title}</p>
          <p className="text-sm text-muted-foreground">
            {contribution.points} Points saved
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onReturn}>
          Return Points
        </Button>
      </div>
    </div>
  );
}

function RewardRequestCard({
  request,
  tone,
  onCancel,
}: {
  request: RewardRequestSummary;
  tone: "pending" | "approved" | "fulfilled";
  onCancel?: () => void;
}) {
  const toneClass =
    tone === "approved" || tone === "fulfilled"
      ? "border-emerald-200 bg-emerald-50"
      : "border-violet-200 bg-violet-50";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{request.title}</p>
          <p className="text-sm text-muted-foreground">
            {request.contributionPoints + request.reservedPoints} Points -{" "}
            {request.status}
          </p>
        </div>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle aria-hidden="true" className="h-4 w-4" />
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProgressCheckInCard({
  checkIn,
  tone,
  onSubmit,
}: {
  checkIn: ProgressCheckInSummary;
  tone: "pending" | "needs_work";
  onSubmit?: () => void;
}) {
  const toneClass =
    tone === "needs_work" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium">{checkIn.title}</p>
          <p className="text-sm text-muted-foreground">
            Progress Check-in - {formatDate(checkIn.submittedAt.slice(0, 10))}
          </p>
        </div>
        {onSubmit ? (
          <Button type="button" variant="child" onClick={onSubmit}>
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Submit again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPointDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

function getDeltaClass(delta: number): string {
  if (delta > 0) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (delta < 0) {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-muted text-foreground";
}

function EmptyState({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/35 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
