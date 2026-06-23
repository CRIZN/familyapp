"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flag,
  Gift,
  KeyRound,
  ListChecks,
  PauseCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";

import { getParentBriefing } from "@/domain/briefing";
import type { AgendaEvent } from "@/domain/calendar";
import {
  configureAppleCalendar,
  getParentAgenda,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "@/domain/calendar";
import type { ApprovalQueueItem, ChoreOccurrence } from "@/domain/chores";
import {
  approveChoreSubmissions,
  archiveChore,
  createChore,
  getApprovalQueue,
  getChildChoreBoard,
  getRoutineLabel,
  markChoreSubmissionNeedsWork,
  pauseChore,
  skipChoreOccurrence,
} from "@/domain/chores";
import {
  approveProgressCheckIns,
  archiveGoal,
  completeGoal,
  createGoal,
  markProgressCheckInNeedsWork,
} from "@/domain/goals";
import {
  approveRewardRequest,
  archiveReward,
  createReward,
  fulfillRewardRequest,
  rejectRewardRequest,
  updateReward,
} from "@/domain/rewards";
import { updateChildPin } from "@/domain/household";
import { awardBonusPoints, createPointAdjustment } from "@/domain/points";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearHousehold,
  getHouseholdSnapshot,
  getHydratedSnapshot,
  getServerHydratedSnapshot,
  getServerSnapshot,
  saveHousehold,
  subscribeHousehold,
  subscribeHydration,
} from "@/features/household/local-household-store";

type EventParticipantDraft = {
  isAllHousehold: boolean;
  participantChildIds: string[];
};

export function ParentViewPage() {
  const hasLoaded = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const household = useSyncExternalStore(
    subscribeHousehold,
    getHouseholdSnapshot,
    getServerSnapshot,
  );
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});
  const [choreTitle, setChoreTitle] = useState("");
  const [choreChildId, setChoreChildId] = useState("");
  const [chorePointValue, setChorePointValue] = useState("1");
  const [choreDueDate, setChoreDueDate] = useState(getTodayDateKey());
  const [choreRoutine, setChoreRoutine] = useState("none");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalChildId, setGoalChildId] = useState("");
  const [goalPointValue, setGoalPointValue] = useState("5");
  const [bonusChildId, setBonusChildId] = useState("");
  const [bonusPoints, setBonusPoints] = useState("1");
  const [bonusReason, setBonusReason] = useState("");
  const [adjustmentChildId, setAdjustmentChildId] = useState("");
  const [adjustmentPoints, setAdjustmentPoints] = useState("1");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [calendarSourceUrl, setCalendarSourceUrl] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(getTodayDateKey());
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventLocation, setEventLocation] = useState("");
  const [eventParticipantDrafts, setEventParticipantDrafts] = useState<
    Record<string, EventParticipantDraft>
  >({});
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardPointCost, setRewardPointCost] = useState("10");
  const [rewardType, setRewardType] = useState("custom");
  const [rewardDrafts, setRewardDrafts] = useState<
    Record<string, { title: string; pointCost: string; type: string }>
  >({});
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <p className="text-sm text-muted-foreground">Loading Parent View...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-md border border-border bg-background p-6 shadow-panel">
          <ShieldCheck aria-hidden="true" className="mb-4 h-9 w-9 text-parent" />
          <h1 className="text-2xl font-semibold">Parent View</h1>
          <p className="mt-2 text-muted-foreground">
            Create the Household before managing Parents, Children, and PINs.
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

  async function savePin(childId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = await updateChildPin(
        household,
        childId,
        pinDrafts[childId] ?? "",
      );
      saveHousehold(updated);
      setPinDrafts({ ...pinDrafts, [childId]: "" });
      setMessage("Child PIN updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update PIN.");
    }
  }

  function resetDemoState() {
    clearHousehold();
  }

  function onCreateChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = createChore(household, {
        title: choreTitle,
        childId: choreChildId || household.children[0]?.id || "",
        pointValue: Number(chorePointValue),
        dueDate: choreDueDate,
        routine:
          choreRoutine === "none"
            ? null
            : { frequency: choreRoutine === "daily" ? "daily" : "weekly" },
      });
      saveHousehold(updated);
      setChoreTitle("");
      setChorePointValue("1");
      setChoreDueDate(getTodayDateKey());
      setChoreRoutine("none");
      setMessage("Chore created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create Chore.");
    }
  }

  function approveSelectedSubmissions() {
    if (!household || selectedApprovalIds.length === 0) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const selectedItems = getSelectedQueueItems(household, selectedApprovalIds);
      const choreSubmissionIds = selectedItems
        .filter((item) => item.type === "chore_submission")
        .map((item) => item.id);
      const progressCheckInIds = selectedItems
        .filter((item) => item.type === "progress_check_in")
        .map((item) => item.id);
      const rewardRequestIds = selectedItems
        .filter((item) => item.type === "reward_request")
        .map((item) => item.id);
      let updated = household;
      if (choreSubmissionIds.length > 0) {
        updated = approveChoreSubmissions(updated, choreSubmissionIds);
      }
      if (progressCheckInIds.length > 0) {
        updated = approveProgressCheckIns(updated, progressCheckInIds);
      }
      for (const rewardRequestId of rewardRequestIds) {
        updated = approveRewardRequest(updated, rewardRequestId);
      }
      saveHousehold(updated);
      setSelectedApprovalIds([]);
      setMessage("Selected Approval Queue items approved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not approve selected items.",
      );
    }
  }

  function rejectSelectedRewardRequests() {
    if (!household || selectedApprovalIds.length === 0) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const rewardRequestIds = getSelectedQueueItems(
        household,
        selectedApprovalIds,
      )
        .filter((item) => item.type === "reward_request")
        .map((item) => item.id);
      let updated = household;
      for (const rewardRequestId of rewardRequestIds) {
        updated = rejectRewardRequest(updated, rewardRequestId);
      }
      saveHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => !rewardRequestIds.includes(candidate)),
      );
      setMessage("Selected Reward Requests rejected.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not reject selected Reward Requests.",
      );
    }
  }

  function approveQueueItem(item: ApprovalQueueItem) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated =
        item.type === "chore_submission"
          ? approveChoreSubmissions(household, [item.id])
          : item.type === "progress_check_in"
            ? approveProgressCheckIns(household, [item.id])
            : approveRewardRequest(household, item.id);
      saveHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== item.id),
      );
      setMessage(
        item.type === "chore_submission"
          ? "Chore Submission approved."
          : item.type === "progress_check_in"
            ? "Progress Check-in approved."
            : "Reward Request approved.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not approve item.",
      );
    }
  }

  function markNeedsWork(item: ApprovalQueueItem) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated =
        item.type === "chore_submission"
          ? markChoreSubmissionNeedsWork(household, item.id)
          : item.type === "progress_check_in"
            ? markProgressCheckInNeedsWork(household, item.id)
            : rejectRewardRequest(household, item.id);
      saveHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== item.id),
      );
      setMessage(
        item.type === "chore_submission"
          ? "Chore Submission marked Needs Work."
          : item.type === "progress_check_in"
            ? "Progress Check-in marked Needs Work."
            : "Reward Request rejected.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not mark item Needs Work.",
      );
    }
  }

  function skipOccurrence(chore: ChoreOccurrence) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = skipChoreOccurrence(household, {
        childId: chore.childId,
        choreId: chore.choreId,
        occurrenceDate: chore.dueDate,
      });
      saveHousehold(updated);
      setMessage("Chore occurrence skipped.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not skip Chore.",
      );
    }
  }

  function skipSubmissionOccurrence(submissionId: string) {
    if (!household) {
      return;
    }
    const item = getApprovalQueue(household).find(
      (candidate) => candidate.id === submissionId,
    );
    if (!item || item.type !== "chore_submission") {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = skipChoreOccurrence(household, {
        childId: item.childId,
        choreId: item.choreId,
        occurrenceDate: item.occurrenceDate,
      });
      saveHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== submissionId),
      );
      setMessage("Chore occurrence skipped.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not skip Chore.",
      );
    }
  }

  function pauseExistingChore(choreId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(pauseChore(household, choreId));
      setMessage("Chore paused.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not pause Chore.",
      );
    }
  }

  function archiveExistingChore(choreId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(archiveChore(household, choreId));
      setMessage("Chore archived.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not archive Chore.",
      );
    }
  }

  function onCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = createGoal(household, {
        title: goalTitle,
        childId: goalChildId || household.children[0]?.id || "",
        pointValue: Number(goalPointValue),
      });
      saveHousehold(updated);
      setGoalTitle("");
      setGoalPointValue("5");
      setMessage("Goal created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create Goal.");
    }
  }

  function completeExistingGoal(goalId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(completeGoal(household, goalId));
      setMessage("Goal completed.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not complete Goal.",
      );
    }
  }

  function archiveExistingGoal(goalId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(archiveGoal(household, goalId));
      setMessage("Goal archived.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not archive Goal.",
      );
    }
  }

  function onAwardBonusPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = awardBonusPoints(household, {
        childId: bonusChildId || household.children[0]?.id || "",
        points: Number(bonusPoints),
        reason: bonusReason,
      });
      saveHousehold(updated);
      setBonusPoints("1");
      setBonusReason("");
      setMessage("Bonus Points awarded.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not award Bonus Points.",
      );
    }
  }

  function onCreatePointAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = createPointAdjustment(household, {
        childId: adjustmentChildId || household.children[0]?.id || "",
        points: Number(adjustmentPoints),
        reason: adjustmentReason,
      });
      saveHousehold(updated);
      setAdjustmentPoints("1");
      setAdjustmentReason("");
      setMessage("Point Adjustment recorded.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not record Point Adjustment.",
      );
    }
  }

  function onCreateReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = createReward(household, {
        title: rewardTitle,
        pointCost: Number(rewardPointCost),
        type: toRewardType(rewardType),
      });
      saveHousehold(updated);
      setRewardTitle("");
      setRewardPointCost("10");
      setRewardType("custom");
      setMessage("Reward created.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create Reward.",
      );
    }
  }

  function saveRewardDraft(rewardId: string) {
    if (!household) {
      return;
    }
    const existing = household.rewards.find((reward) => reward.id === rewardId);
    const draft = rewardDrafts[rewardId];
    if (!existing) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = updateReward(household, rewardId, {
        title: draft?.title ?? existing.title,
        pointCost: Number(draft?.pointCost ?? existing.pointCost),
        type: toRewardType(draft?.type ?? existing.type),
      });
      saveHousehold(updated);
      setRewardDrafts((current) => {
        const next = { ...current };
        delete next[rewardId];
        return next;
      });
      setMessage("Reward updated.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update Reward.",
      );
    }
  }

  function archiveExistingReward(rewardId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(archiveReward(household, rewardId));
      setMessage("Reward archived.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not archive Reward.",
      );
    }
  }

  function fulfillApprovedRewardRequest(requestId: string) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      saveHousehold(fulfillRewardRequest(household, requestId));
      setMessage("Reward fulfilled.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not fulfill Reward.",
      );
    }
  }

  function onConfigureCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    const name =
      calendarName || household.calendarConnection?.calendarName || "";
    const sourceUrl =
      calendarSourceUrl || household.calendarConnection?.sourceUrl || "";
    try {
      const updated = configureAppleCalendar(household, {
        calendarName: name,
        sourceUrl,
      });
      saveHousehold(updated);
      setCalendarName(updated.calendarConnection?.calendarName ?? "");
      setCalendarSourceUrl(updated.calendarConnection?.sourceUrl ?? "");
      setMessage("Apple Family Calendar connected.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not configure Apple Calendar.",
      );
    }
  }

  function onSyncCalendarEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updated = syncAppleCalendarEvents(household, [
        {
          appleEventId: createAppleEventId(
            eventTitle,
            eventDate,
            eventStartTime,
          ),
          title: eventTitle,
          startsAt: toAppleDateTime(eventDate, eventStartTime),
          endsAt: toAppleDateTime(eventDate, eventEndTime),
          location: eventLocation,
        },
      ]);
      saveHousehold(updated);
      setEventTitle("");
      setEventStartTime("09:00");
      setEventEndTime("10:00");
      setEventLocation("");
      setMessage("Apple Calendar Event synced.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not sync Event.",
      );
    }
  }

  function saveEventParticipants(event: AgendaEvent) {
    if (!household) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const draft = getEventParticipantDraft(event);
      const updated = updateEventParticipants(household, {
        eventId: event.eventId,
        participantChildIds: draft.participantChildIds,
        isAllHousehold: draft.isAllHousehold,
      });
      saveHousehold(updated);
      setMessage("Event Participants updated.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update Participants.",
      );
    }
  }

  function getEventParticipantDraft(event: AgendaEvent): EventParticipantDraft {
    return (
      eventParticipantDrafts[event.eventId] ?? {
        isAllHousehold: event.isAllHousehold,
        participantChildIds: event.participantChildIds,
      }
    );
  }

  const approvalQueue = getApprovalQueue(household);
  const parentAgenda = getParentAgenda(household);
  const todayDateKey = getTodayDateKey();
  const parentBriefing = getParentBriefing(household, todayDateKey);
  const calendarNameValue =
    calendarName || household.calendarConnection?.calendarName || "";
  const calendarSourceUrlValue =
    calendarSourceUrl || household.calendarConnection?.sourceUrl || "";
  const hasSelectedRewardRequest = getSelectedQueueItems(
    household,
    selectedApprovalIds,
  ).some((item) => item.type === "reward_request");
  const dueOccurrences = household.children.flatMap((child) => {
    const board = getChildChoreBoard(household, child.id, todayDateKey);
    return [...board.overdue, ...board.today].map((chore) => ({
      ...chore,
      childName: child.name,
    }));
  });
  const approvedRewardRequests = household.rewardRequests
    .filter((request) => request.status === "approved")
    .flatMap((request) => {
      const reward = household.rewards.find(
        (candidate) => candidate.id === request.rewardId,
      );
      const child = household.children.find(
        (candidate) => candidate.id === request.childId,
      );
      if (!reward || !child) {
        return [];
      }
      return [{ ...request, rewardTitle: reward.title, childName: child.name }];
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
            Parent View
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {household.name}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={resetDemoState}>
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Reset demo state
        </Button>
      </div>

      <section className="mb-4 rounded-md border border-border bg-background p-5 shadow-panel">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles aria-hidden="true" className="h-6 w-6 text-parent" />
              <h2 className="text-xl font-semibold">Briefing</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(todayDateKey)} and {formatDate(getTomorrowDateKey(todayDateKey))}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <BriefingMetric
              label="Approval Queue"
              value={parentBriefing.approvalSummary.total}
            />
            <BriefingMetric
              label="Overdue Chores"
              value={parentBriefing.overdueChores.length}
            />
            <BriefingMetric
              label="Rewards"
              value={parentBriefing.unfulfilledRewards.length}
            />
            <BriefingMetric
              label="Events"
              value={parentBriefing.eventDays.reduce(
                (total, day) => total + day.events.length,
                0,
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-5 w-5 text-parent" />
              <h3 className="font-semibold">Important Events</h3>
            </div>
            {parentBriefing.eventDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Events today or tomorrow.
              </p>
            ) : (
              <div className="space-y-3">
                {parentBriefing.eventDays.map((day) => (
                  <div className="space-y-2" key={day.date}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDate(day.date)}
                    </p>
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
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.participantNames.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <ListChecks aria-hidden="true" className="h-5 w-5 text-parent" />
                <h3 className="font-semibold">Needs Attention</h3>
              </div>
              <div className="grid gap-2 text-sm">
                <BriefingLine
                  label="Chore Submissions"
                  value={parentBriefing.approvalSummary.choreSubmissions}
                />
                <BriefingLine
                  label="Progress Check-ins"
                  value={parentBriefing.approvalSummary.progressCheckIns}
                />
                <BriefingLine
                  label="Reward Requests"
                  value={parentBriefing.approvalSummary.rewardRequests}
                />
              </div>
              {parentBriefing.overdueChores.length > 0 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-medium">Overdue Chores</p>
                  <div className="mt-2 space-y-2">
                    {parentBriefing.overdueChores.slice(0, 3).map((chore) => (
                      <p
                        className="text-sm text-muted-foreground"
                        key={`${chore.choreId}-${chore.dueDate}`}
                      >
                        {chore.childName} - {chore.title} -{" "}
                        {formatDate(chore.dueDate)}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {parentBriefing.unfulfilledRewards.length > 0 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-medium">Unfulfilled Rewards</p>
                  <div className="mt-2 space-y-2">
                    {parentBriefing.unfulfilledRewards
                      .slice(0, 3)
                      .map((reward) => (
                        <p
                          className="text-sm text-muted-foreground"
                          key={reward.requestId}
                        >
                          {reward.childName} - {reward.title} - {reward.points}{" "}
                          Points
                        </p>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-parent" />
                <h3 className="font-semibold">Suggested Actions</h3>
              </div>
              {parentBriefing.suggestedActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Suggested Actions right now.
                </p>
              ) : (
                <div className="space-y-2">
                  {parentBriefing.suggestedActions.map((action) => (
                    <a
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                      href={action.href}
                      key={action.id}
                    >
                      <span>
                        <span className="block font-medium">{action.label}</span>
                        <span className="block text-muted-foreground">
                          {action.detail}
                        </span>
                      </span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Parents</h2>
          </div>
          <div className="space-y-3">
            {household.parents.map((parent) => (
              <div className="rounded-md border border-border p-3" key={parent.id}>
                <p className="font-medium">{parent.name}</p>
                <p className="text-sm text-muted-foreground">{parent.email}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <UserRound aria-hidden="true" className="h-6 w-6 text-child" />
            <h2 className="text-xl font-semibold">Children and PINs</h2>
          </div>
          <div className="space-y-4">
            {household.children.map((child) => (
              <div
                className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_12rem_auto]"
                key={child.id}
              >
                <div>
                  <p className="font-medium">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {child.pointBalance} Points
                  </p>
                </div>
                <div>
                  <Label htmlFor={`${child.id}-pin`}>New Child PIN</Label>
                  <Input
                    className="mt-2"
                    id={`${child.id}-pin`}
                    inputMode="numeric"
                    maxLength={8}
                    value={pinDrafts[child.id] ?? ""}
                    onChange={(event) =>
                      setPinDrafts({
                        ...pinDrafts,
                        [child.id]: event.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  className="self-end"
                  type="button"
                  variant="parent"
                  onClick={() => savePin(child.id)}
                >
                  <KeyRound aria-hidden="true" className="h-4 w-4" />
                  Update PIN
                </Button>
              </div>
            ))}
          </div>

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
        </section>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onConfigureCalendar}
        >
          <div className="mb-4 flex items-center gap-3">
            <CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Apple Calendar</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="calendar-name">Calendar name</Label>
              <Input
                className="mt-2"
                id="calendar-name"
                value={calendarNameValue}
                onChange={(event) => setCalendarName(event.target.value)}
                placeholder="Family"
              />
            </div>
            <div>
              <Label htmlFor="calendar-source">Apple source</Label>
              <Input
                className="mt-2"
                id="calendar-source"
                value={calendarSourceUrlValue}
                onChange={(event) => setCalendarSourceUrl(event.target.value)}
                placeholder="webcal://..."
              />
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Save Calendar
          </Button>
        </form>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onSyncCalendarEvent}
        >
          <div className="mb-4 flex items-center gap-3">
            <CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Sync Apple Event</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="event-title">Event</Label>
              <Input
                className="mt-2"
                id="event-title"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="Soccer practice"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="event-date">Date</Label>
                <Input
                  className="mt-2"
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event-start">Starts</Label>
                <Input
                  className="mt-2"
                  id="event-start"
                  type="time"
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event-end">Ends</Label>
                <Input
                  className="mt-2"
                  id="event-end"
                  type="time"
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                className="mt-2"
                id="event-location"
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                placeholder="Field 2"
              />
            </div>
          </div>
          <Button
            className="mt-4"
            type="submit"
            variant="parent"
            disabled={!household.calendarConnection}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Sync Event
          </Button>
        </form>

        <div className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Household Agenda</h2>
          </div>
          {parentAgenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Synced Apple Calendar Events will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              {parentAgenda.map((day) => (
                <div className="space-y-3" key={day.date}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {formatDate(day.date)}
                  </h3>
                  {day.events.map((event) => {
                    const draft = getEventParticipantDraft(event);
                    return (
                      <div
                        className="rounded-md border border-border p-3"
                        key={event.eventId}
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(event.startsAt)} -{" "}
                              {formatTime(event.endsAt)}
                              {event.location ? ` - ${event.location}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {event.participantNames.join(", ")}
                            </p>
                          </div>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                            Read-only
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                className="h-4 w-4 rounded border-border"
                                type="checkbox"
                                checked={draft.isAllHousehold}
                                onChange={(changeEvent) =>
                                  setEventParticipantDrafts({
                                    ...eventParticipantDrafts,
                                    [event.eventId]: {
                                      isAllHousehold:
                                        changeEvent.target.checked,
                                      participantChildIds: [],
                                    },
                                  })
                                }
                              />
                              All Household
                            </label>
                            <div className="flex flex-wrap gap-3">
                              {household.children.map((child) => (
                                <label
                                  className="flex items-center gap-2 text-sm"
                                  key={child.id}
                                >
                                  <input
                                    className="h-4 w-4 rounded border-border"
                                    type="checkbox"
                                    disabled={draft.isAllHousehold}
                                    checked={draft.participantChildIds.includes(
                                      child.id,
                                    )}
                                    onChange={(changeEvent) =>
                                      setEventParticipantDrafts({
                                        ...eventParticipantDrafts,
                                        [event.eventId]: {
                                          isAllHousehold: false,
                                          participantChildIds:
                                            changeEvent.target.checked
                                              ? [
                                                  ...draft.participantChildIds,
                                                  child.id,
                                                ]
                                              : draft.participantChildIds.filter(
                                                  (candidate) =>
                                                    candidate !== child.id,
                                                ),
                                        },
                                      })
                                    }
                                  />
                                  {child.name}
                                </label>
                              ))}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="parent"
                            size="sm"
                            onClick={() => saveEventParticipants(event)}
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Save Participants
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2"
          id="approval-queue"
        >
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <ListChecks aria-hidden="true" className="h-6 w-6 text-parent" />
              <h2 className="text-xl font-semibold">Approval Queue</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="parent"
                onClick={approveSelectedSubmissions}
                disabled={selectedApprovalIds.length === 0}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Approve selected
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={rejectSelectedRewardRequests}
                disabled={!hasSelectedRewardRequest}
              >
                <XCircle aria-hidden="true" className="h-4 w-4" />
                Reject selected Rewards
              </Button>
            </div>
          </div>
          {approvalQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chore Submissions and Progress Check-ins waiting for review will
              appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {approvalQueue.map((item) => {
                const selected = selectedApprovalIds.includes(item.id);
                return (
                  <div
                    className={`rounded-md border p-3 ${getApprovalQueueItemClass(item)}`}
                    key={item.id}
                  >
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                      <label className="flex items-start gap-3">
                        <input
                          className="mt-1 h-4 w-4 rounded border-border"
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            setSelectedApprovalIds((current) =>
                              event.target.checked
                                ? [...current, item.id]
                                : current.filter(
                                    (candidate) => candidate !== item.id,
                                  ),
                            );
                          }}
                        />
                        <span>
                          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-parent">
                            {getApprovalQueueItemLabel(item)}
                          </span>
                          <span className="block font-medium">{item.title}</span>
                          <span className="block text-sm text-muted-foreground">
                            {getApprovalQueueItemDetail(item)}
                          </span>
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="parent"
                          size="sm"
                          onClick={() => approveQueueItem(item)}
                        >
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => markNeedsWork(item)}
                        >
                          <XCircle aria-hidden="true" className="h-4 w-4" />
                          {item.type === "reward_request"
                            ? "Reject"
                            : "Needs Work"}
                        </Button>
                        {item.type === "chore_submission" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => skipSubmissionOccurrence(item.id)}
                          >
                            <SkipForward
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Skip
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2"
          id="due-chores"
        >
          <div className="mb-4 flex items-center gap-3">
            <SkipForward aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Due Chore Occurrences</h2>
          </div>
          {dueOccurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chores due today or Overdue will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {dueOccurrences.map((chore) => (
                <div
                  className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center"
                  key={`${chore.choreId}-${chore.dueDate}`}
                >
                  <div>
                    <p className="font-medium">{chore.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {chore.childName} - {formatDate(chore.dueDate)} -{" "}
                      {chore.pointValue} Points
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => skipOccurrence(chore)}
                  >
                    <SkipForward aria-hidden="true" className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onCreateChore}
        >
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Create Chore</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="chore-title">Chore</Label>
              <Input
                className="mt-2"
                id="chore-title"
                value={choreTitle}
                onChange={(event) => setChoreTitle(event.target.value)}
                placeholder="Unload dishwasher"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chore-child">Child</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="chore-child"
                  value={choreChildId || household.children[0]?.id || ""}
                  onChange={(event) => setChoreChildId(event.target.value)}
                >
                  {household.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="chore-points">Points</Label>
                <Input
                  className="mt-2"
                  id="chore-points"
                  min={1}
                  type="number"
                  value={chorePointValue}
                  onChange={(event) => setChorePointValue(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chore-due-date">Due date</Label>
                <Input
                  className="mt-2"
                  id="chore-due-date"
                  type="date"
                  value={choreDueDate}
                  onChange={(event) => setChoreDueDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="chore-routine">Routine</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="chore-routine"
                  value={choreRoutine}
                  onChange={(event) => setChoreRoutine(event.target.value)}
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Chore
          </Button>
        </form>

        <div className="rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            <ClipboardList aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Chores</h2>
          </div>
          {household.chores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create the first Chore to make it visible in Child View.
            </p>
          ) : (
            <div className="space-y-3">
              {household.chores.map((chore) => {
                const child = household.children.find(
                  (candidate) => candidate.id === chore.childId,
                );
                return (
                  <div
                    className="rounded-md border border-border p-3"
                    key={chore.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{chore.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {child?.name} - {chore.pointValue} Points
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                          {getRoutineLabel(chore.routine)}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
                          {chore.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Due {formatDate(chore.dueDate)}
                    </p>
                    {chore.status === "active" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => pauseExistingChore(chore.id)}
                        >
                          <PauseCircle aria-hidden="true" className="h-4 w-4" />
                          Pause
                        </Button>
                      </div>
                    ) : null}
                    {chore.status === "paused" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => archiveExistingChore(chore.id)}
                        >
                          <Archive aria-hidden="true" className="h-4 w-4" />
                          Archive
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onCreateGoal}
        >
          <div className="mb-4 flex items-center gap-3">
            <Flag aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Create Goal</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="goal-title">Goal</Label>
              <Input
                className="mt-2"
                id="goal-title"
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder="Read three books"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="goal-child">Child</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="goal-child"
                  value={goalChildId || household.children[0]?.id || ""}
                  onChange={(event) => setGoalChildId(event.target.value)}
                >
                  {household.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="goal-points">Points</Label>
                <Input
                  className="mt-2"
                  id="goal-points"
                  min={1}
                  type="number"
                  value={goalPointValue}
                  onChange={(event) => setGoalPointValue(event.target.value)}
                />
              </div>
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Goal
          </Button>
        </form>

        <div className="rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            <Flag aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Goals</h2>
          </div>
          {household.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create the first Goal to make it visible in Child View.
            </p>
          ) : (
            <div className="space-y-3">
              {household.goals.map((goal) => {
                const child = household.children.find(
                  (candidate) => candidate.id === goal.childId,
                );
                return (
                  <div
                    className="rounded-md border border-border p-3"
                    key={goal.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {child?.name} - {goal.pointValue} Points
                        </p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
                        {goal.status}
                      </span>
                    </div>
                    {goal.status === "active" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="parent"
                          size="sm"
                          onClick={() => completeExistingGoal(goal.id)}
                        >
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => archiveExistingGoal(goal.id)}
                        >
                          <Archive aria-hidden="true" className="h-4 w-4" />
                          Archive
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onAwardBonusPoints}
        >
          <div className="mb-4 flex items-center gap-3">
            <Sparkles aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Bonus Points</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bonus-child">Child</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="bonus-child"
                  value={bonusChildId || household.children[0]?.id || ""}
                  onChange={(event) => setBonusChildId(event.target.value)}
                >
                  {household.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="bonus-points">Points</Label>
                <Input
                  className="mt-2"
                  id="bonus-points"
                  min={1}
                  type="number"
                  value={bonusPoints}
                  onChange={(event) => setBonusPoints(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bonus-reason">Reason</Label>
              <Input
                className="mt-2"
                id="bonus-reason"
                value={bonusReason}
                onChange={(event) => setBonusReason(event.target.value)}
                placeholder="Helped without being asked"
              />
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Award Bonus
          </Button>
        </form>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onCreatePointAdjustment}
        >
          <div className="mb-4 flex items-center gap-3">
            <ListChecks aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Point Adjustment</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="adjustment-child">Child</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="adjustment-child"
                  value={adjustmentChildId || household.children[0]?.id || ""}
                  onChange={(event) => setAdjustmentChildId(event.target.value)}
                >
                  {household.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="adjustment-points">Point change</Label>
                <Input
                  className="mt-2"
                  id="adjustment-points"
                  type="number"
                  value={adjustmentPoints}
                  onChange={(event) => setAdjustmentPoints(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="adjustment-reason">Reason</Label>
              <Input
                className="mt-2"
                id="adjustment-reason"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="Corrected duplicate entry"
              />
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Record Adjustment
          </Button>
        </form>

        <form
          className="rounded-md border border-border bg-background p-5 shadow-panel"
          onSubmit={onCreateReward}
        >
          <div className="mb-4 flex items-center gap-3">
            <Gift aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Create Reward</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="reward-title">Reward</Label>
              <Input
                className="mt-2"
                id="reward-title"
                value={rewardTitle}
                onChange={(event) => setRewardTitle(event.target.value)}
                placeholder="Allowance payout"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="reward-cost">Point cost</Label>
                <Input
                  className="mt-2"
                  id="reward-cost"
                  min={1}
                  type="number"
                  value={rewardPointCost}
                  onChange={(event) => setRewardPointCost(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reward-type">Type</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="reward-type"
                  value={rewardType}
                  onChange={(event) => setRewardType(event.target.value)}
                >
                  <option value="allowance">Allowance</option>
                  <option value="experience">Experience</option>
                  <option value="privilege">Privilege</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>
          <Button className="mt-4" type="submit" variant="parent">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Reward
          </Button>
        </form>

        <div className="rounded-md border border-border bg-background p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            <Gift aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Reward Catalog</h2>
          </div>
          {household.rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create shared Rewards for Children to request.
            </p>
          ) : (
            <div className="space-y-3">
              {household.rewards.map((reward) => {
                const draft = rewardDrafts[reward.id] ?? {
                  title: reward.title,
                  pointCost: String(reward.pointCost),
                  type: reward.type,
                };
                return (
                  <div
                    className="rounded-md border border-border p-3"
                    key={reward.id}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem_9rem]">
                      <div>
                        <Label htmlFor={`${reward.id}-title`}>Reward</Label>
                        <Input
                          className="mt-2"
                          id={`${reward.id}-title`}
                          value={draft.title}
                          disabled={reward.status !== "active"}
                          onChange={(event) =>
                            setRewardDrafts({
                              ...rewardDrafts,
                              [reward.id]: {
                                ...draft,
                                title: event.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${reward.id}-cost`}>Points</Label>
                        <Input
                          className="mt-2"
                          id={`${reward.id}-cost`}
                          min={1}
                          type="number"
                          value={draft.pointCost}
                          disabled={reward.status !== "active"}
                          onChange={(event) =>
                            setRewardDrafts({
                              ...rewardDrafts,
                              [reward.id]: {
                                ...draft,
                                pointCost: event.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${reward.id}-type`}>Type</Label>
                        <select
                          className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          id={`${reward.id}-type`}
                          value={draft.type}
                          disabled={reward.status !== "active"}
                          onChange={(event) =>
                            setRewardDrafts({
                              ...rewardDrafts,
                              [reward.id]: {
                                ...draft,
                                type: event.target.value,
                              },
                            })
                          }
                        >
                          <option value="allowance">Allowance</option>
                          <option value="experience">Experience</option>
                          <option value="privilege">Privilege</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
                        {reward.status}
                      </span>
                      {reward.status === "active" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="parent"
                            size="sm"
                            onClick={() => saveRewardDraft(reward.id)}
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => archiveExistingReward(reward.id)}
                          >
                            <Archive aria-hidden="true" className="h-4 w-4" />
                            Archive
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="rounded-md border border-border bg-background p-5 shadow-panel lg:col-span-2"
          id="reward-fulfillment"
        >
          <div className="mb-4 flex items-center gap-3">
            <Gift aria-hidden="true" className="h-6 w-6 text-parent" />
            <h2 className="text-xl font-semibold">Reward Fulfillment</h2>
          </div>
          {approvedRewardRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Approved Reward Requests waiting for delivery will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {approvedRewardRequests.map((request) => (
                <div
                  className="flex flex-col justify-between gap-3 rounded-md border border-purple-200 bg-purple-50 p-3 sm:flex-row sm:items-center"
                  key={request.id}
                >
                  <div>
                    <p className="font-medium">{request.rewardTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.childName} -{" "}
                      {request.contributionPoints + request.reservedPoints}{" "}
                      Points
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="parent"
                    size="sm"
                    onClick={() => fulfillApprovedRewardRequest(request.id)}
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Fulfill
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          className="rounded-md border border-border bg-child p-5 text-child-foreground shadow-panel transition-colors hover:bg-child/90"
          href="/child"
        >
          <h2 className="text-lg font-semibold">Open Child View</h2>
          <p className="mt-2 text-sm text-child-foreground/80">
            Select a Child profile and enter the Child PIN.
          </p>
        </Link>
      </section>
    </div>
  );
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowDateKey(today: string): string {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
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

function toAppleDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00.000`).toISOString();
}

function createAppleEventId(title: string, date: string, time: string): string {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `apple-${date}-${time}-${normalizedTitle || "event"}`;
}

function getSelectedQueueItems(
  household: NonNullable<ReturnType<typeof getHouseholdSnapshot>>,
  selectedApprovalIds: string[],
): ApprovalQueueItem[] {
  const selectedIds = new Set(selectedApprovalIds);
  return getApprovalQueue(household).filter((item) => selectedIds.has(item.id));
}

function getApprovalQueueItemLabel(item: ApprovalQueueItem): string {
  return item.type === "chore_submission"
    ? "Chore Submission"
    : item.type === "progress_check_in"
      ? "Progress Check-in"
      : "Reward Request";
}

function getApprovalQueueItemDetail(item: ApprovalQueueItem): string {
  if (item.type === "chore_submission") {
    return `${item.childName} - ${item.pointValue} Points - ${formatDate(
      item.occurrenceDate,
    )}`;
  }
  if (item.type === "progress_check_in") {
    return `${item.childName} - ${item.awardedPoints} progress Point - ${item.remainingPoints} remaining`;
  }
  return `${item.childName} - ${item.pointCost} Points - ${item.contributionPoints} contributed`;
}

function getApprovalQueueItemClass(item: ApprovalQueueItem): string {
  return item.type === "chore_submission"
    ? "border-blue-200 bg-blue-50"
    : item.type === "progress_check_in"
      ? "border-emerald-200 bg-emerald-50"
      : "border-purple-200 bg-purple-50";
}

function BriefingMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function BriefingLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function toRewardType(value: string) {
  return value === "allowance" ||
    value === "experience" ||
    value === "privilege" ||
    value === "custom"
    ? value
    : "custom";
}
