"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useState } from "react";
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
  ShieldCheck,
  SkipForward,
  Sparkles,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { getParentBriefing } from "@/domain/briefing";
import { getParentWeeklyReview } from "@/domain/weekly-review";
import type { AgendaEvent } from "@/domain/calendar";
import {
  configureAppleCalendar,
  getParentAgenda,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "@/domain/calendar";
import type { ApprovalQueueItem, ChoreOccurrence } from "@/domain/chores";
import {
  getApprovalQueue,
  getChildChoreBoard,
  getRoutineLabel,
} from "@/domain/chores";
import {
  approveProgressCheckIns,
  archiveGoal,
  completeGoal,
  createGoal,
  getChildGoalBoard,
  markProgressCheckInNeedsWork,
} from "@/domain/goals";
import type { Household } from "@/domain/household";
import { awardBonusPoints, createPointAdjustment } from "@/domain/points";
import {
  approveRewardRequest,
  archiveReward,
  createReward,
  fulfillRewardRequest,
  getChildRewardBoard,
  rejectRewardRequest,
  updateReward,
} from "@/domain/rewards";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addAllowedParentAction,
  approveChoreSubmissionsAction,
  archiveChoreAction,
  createChoreAction,
  markChoreSubmissionNeedsWorkAction,
  pauseChoreAction,
  skipChoreOccurrenceAction,
  updateChildPinAction,
  updateChildProfileAction,
} from "@/server/household/actions";

export type ParentWorkflow =
  | "today"
  | "approvals"
  | "chores"
  | "goals"
  | "rewards"
  | "calendar"
  | "points"
  | "household"
  | "weekly-review";

export const parentWorkflowNavItems: Array<{
  href: string;
  label: string;
  workflow: ParentWorkflow;
}> = [
  { href: "/parent", label: "Today", workflow: "today" },
  { href: "/parent/approvals", label: "Approvals", workflow: "approvals" },
  { href: "/parent/chores", label: "Chores", workflow: "chores" },
  { href: "/parent/goals", label: "Goals", workflow: "goals" },
  { href: "/parent/rewards", label: "Rewards", workflow: "rewards" },
  { href: "/parent/calendar", label: "Calendar", workflow: "calendar" },
  { href: "/parent/points", label: "Points", workflow: "points" },
  { href: "/parent/household", label: "Household", workflow: "household" },
  {
    href: "/parent/weekly-review",
    label: "Weekly Review",
    workflow: "weekly-review",
  },
];

type EventParticipantDraft = {
  isAllHousehold: boolean;
  participantChildIds: string[];
};

type ParentViewPageProps = {
  initialHousehold: Household | null;
  workflow?: ParentWorkflow;
};

export function ParentViewPage({
  initialHousehold,
  workflow = "today",
}: ParentViewPageProps) {
  const [household, setHousehold] = useState<Household | null>(initialHousehold);
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childNameDrafts, setChildNameDrafts] = useState<Record<string, string>>(
    {},
  );
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

  if (!household) {
    return <ParentSetupState />;
  }

  async function savePin(childId: string) {
    if (!household) return;
    setError(null);
    setMessage(null);
    const result = await updateChildPinAction({
      childId,
      pin: pinDrafts[childId] ?? "",
    });
    if (result.status === "ok") {
      setHousehold(result.household);
      setPinDrafts({ ...pinDrafts, [childId]: "" });
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  async function inviteParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const result = await addAllowedParentAction({
      email: parentEmail,
      name: parentName,
    });
    if (result.status === "ok") {
      setHousehold(result.household);
      setParentEmail("");
      setParentName("");
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  async function saveChildProfile(childId: string) {
    setError(null);
    setMessage(null);
    const child = household?.children.find((candidate) => candidate.id === childId);
    const result = await updateChildProfileAction({
      childId,
      name: childNameDrafts[childId] ?? child?.name ?? "",
    });
    if (result.status === "ok") {
      setHousehold(result.household);
      setChildNameDrafts({ ...childNameDrafts, [childId]: "" });
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  function withParentAction(action: () => void, fallback: string) {
    setError(null);
    setMessage(null);
    try {
      action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback);
    }
  }

  async function onCreateChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;

    setError(null);
    setMessage(null);
    const result = await createChoreAction({
      title: choreTitle,
      childId: choreChildId || household.children[0]?.id || "",
      pointValue: Number(chorePointValue),
      dueDate: choreDueDate,
      routine:
        choreRoutine === "none"
          ? null
          : { frequency: choreRoutine === "daily" ? "daily" : "weekly" },
    });

    if (result.status === "ok") {
      setHousehold(result.household);
      setChoreTitle("");
      setChorePointValue("1");
      setChoreDueDate(getTodayDateKey());
      setChoreRoutine("none");
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  async function approveSelectedSubmissions() {
    if (!household || selectedApprovalIds.length === 0) return;
    setError(null);
    setMessage(null);
    try {
      const selectedItems = getSelectedQueueItems(household, selectedApprovalIds);
      let updated = household;
      const choreSubmissionIds = selectedItems
        .filter((item) => item.type === "chore_submission")
        .map((item) => item.id);
      const progressCheckInIds = selectedItems
        .filter((item) => item.type === "progress_check_in")
        .map((item) => item.id);
      const rewardRequestIds = selectedItems
        .filter((item) => item.type === "reward_request")
        .map((item) => item.id);
      if (choreSubmissionIds.length > 0) {
        const result = await approveChoreSubmissionsAction({
          submissionIds: choreSubmissionIds,
        });
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        updated = result.household;
      }
      if (progressCheckInIds.length > 0) {
        updated = approveProgressCheckIns(updated, progressCheckInIds);
      }
      for (const rewardRequestId of rewardRequestIds) {
        updated = approveRewardRequest(updated, rewardRequestId);
      }
      setHousehold(updated);
      setSelectedApprovalIds([]);
      setMessage("Selected Approval Queue items approved.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not approve selected items.",
      );
    }
  }

  function rejectSelectedRewardRequests() {
    if (!household || selectedApprovalIds.length === 0) return;
    withParentAction(() => {
      const rewardRequestIds = getSelectedQueueItems(household, selectedApprovalIds)
        .filter((item) => item.type === "reward_request")
        .map((item) => item.id);
      let updated = household;
      for (const rewardRequestId of rewardRequestIds) {
        updated = rejectRewardRequest(updated, rewardRequestId);
      }
      setHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => !rewardRequestIds.includes(candidate)),
      );
      setMessage("Selected Reward Requests rejected.");
    }, "Could not reject selected Reward Requests.");
  }

  async function approveQueueItem(item: ApprovalQueueItem) {
    if (!household) return;
    setError(null);
    setMessage(null);
    try {
      let updated = household;
      if (item.type === "chore_submission") {
        const result = await approveChoreSubmissionsAction({
          submissionIds: [item.id],
        });
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        updated = result.household;
      } else {
        updated =
          item.type === "progress_check_in"
            ? approveProgressCheckIns(household, [item.id])
            : approveRewardRequest(household, item.id);
      }
      setHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== item.id),
      );
      setMessage(`${getApprovalQueueItemLabel(item)} approved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve item.");
    }
  }

  async function markNeedsWork(item: ApprovalQueueItem) {
    if (!household) return;
    setError(null);
    setMessage(null);
    try {
      let updated = household;
      if (item.type === "chore_submission") {
        const result = await markChoreSubmissionNeedsWorkAction({
          submissionId: item.id,
        });
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        updated = result.household;
      } else {
        updated =
          item.type === "progress_check_in"
            ? markProgressCheckInNeedsWork(household, item.id)
            : rejectRewardRequest(household, item.id);
      }
      setHousehold(updated);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== item.id),
      );
      setMessage(
        item.type === "reward_request"
          ? "Reward Request rejected."
          : `${getApprovalQueueItemLabel(item)} marked Needs Work.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update Approval Queue item.",
      );
    }
  }

  async function skipOccurrence(chore: ChoreOccurrence) {
    if (!household) return;
    setError(null);
    setMessage(null);
    try {
      const result = await skipChoreOccurrenceAction({
        childId: chore.childId,
        choreId: chore.choreId,
        occurrenceDate: chore.dueDate,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setHousehold(result.household);
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not skip Chore.");
    }
  }

  async function skipSubmissionOccurrence(submissionId: string) {
    if (!household) return;
    const item = getApprovalQueue(household).find(
      (candidate) => candidate.id === submissionId,
    );
    if (!item || item.type !== "chore_submission") return;
    setError(null);
    setMessage(null);
    try {
      const result = await skipChoreOccurrenceAction({
        childId: item.childId,
        choreId: item.choreId,
        occurrenceDate: item.occurrenceDate,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setHousehold(result.household);
      setSelectedApprovalIds((current) =>
        current.filter((candidate) => candidate !== submissionId),
      );
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not skip Chore.");
    }
  }

  async function pauseExistingChore(choreId: string) {
    setError(null);
    setMessage(null);
    const result = await pauseChoreAction({ choreId });
    if (result.status === "ok") {
      setHousehold(result.household);
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  async function archiveExistingChore(choreId: string) {
    setError(null);
    setMessage(null);
    const result = await archiveChoreAction({ choreId });
    if (result.status === "ok") {
      setHousehold(result.household);
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  }

  function onCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      setHousehold(
        createGoal(household, {
          title: goalTitle,
          childId: goalChildId || household.children[0]?.id || "",
          pointValue: Number(goalPointValue),
        }),
      );
      setGoalTitle("");
      setGoalPointValue("5");
      setMessage("Goal created.");
    }, "Could not create Goal.");
  }

  function completeExistingGoal(goalId: string) {
    if (!household) return;
    withParentAction(() => {
      setHousehold(completeGoal(household, goalId));
      setMessage("Goal completed.");
    }, "Could not complete Goal.");
  }

  function archiveExistingGoal(goalId: string) {
    if (!household) return;
    withParentAction(() => {
      setHousehold(archiveGoal(household, goalId));
      setMessage("Goal archived.");
    }, "Could not archive Goal.");
  }

  function onAwardBonusPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      setHousehold(
        awardBonusPoints(household, {
          childId: bonusChildId || household.children[0]?.id || "",
          points: Number(bonusPoints),
          reason: bonusReason,
        }),
      );
      setBonusPoints("1");
      setBonusReason("");
      setMessage("Bonus Points awarded.");
    }, "Could not award Bonus Points.");
  }

  function onCreatePointAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      setHousehold(
        createPointAdjustment(household, {
          childId: adjustmentChildId || household.children[0]?.id || "",
          points: Number(adjustmentPoints),
          reason: adjustmentReason,
        }),
      );
      setAdjustmentPoints("1");
      setAdjustmentReason("");
      setMessage("Point Adjustment recorded.");
    }, "Could not record Point Adjustment.");
  }

  function onCreateReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      setHousehold(
        createReward(household, {
          title: rewardTitle,
          pointCost: Number(rewardPointCost),
          type: toRewardType(rewardType),
        }),
      );
      setRewardTitle("");
      setRewardPointCost("10");
      setRewardType("custom");
      setMessage("Reward created.");
    }, "Could not create Reward.");
  }

  function saveRewardDraft(rewardId: string) {
    if (!household) return;
    const existing = household.rewards.find((reward) => reward.id === rewardId);
    const draft = rewardDrafts[rewardId];
    if (!existing) return;
    withParentAction(() => {
      setHousehold(
        updateReward(household, rewardId, {
          title: draft?.title ?? existing.title,
          pointCost: Number(draft?.pointCost ?? existing.pointCost),
          type: toRewardType(draft?.type ?? existing.type),
        }),
      );
      setRewardDrafts((current) => {
        const next = { ...current };
        delete next[rewardId];
        return next;
      });
      setMessage("Reward updated.");
    }, "Could not update Reward.");
  }

  function archiveExistingReward(rewardId: string) {
    if (!household) return;
    withParentAction(() => {
      setHousehold(archiveReward(household, rewardId));
      setMessage("Reward archived.");
    }, "Could not archive Reward.");
  }

  function fulfillApprovedRewardRequest(requestId: string) {
    if (!household) return;
    withParentAction(() => {
      setHousehold(fulfillRewardRequest(household, requestId));
      setMessage("Reward fulfilled.");
    }, "Could not fulfill Reward.");
  }

  function onConfigureCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      const updated = configureAppleCalendar(household, {
        calendarName:
          calendarName || household.calendarConnection?.calendarName || "",
        sourceUrl:
          calendarSourceUrl || household.calendarConnection?.sourceUrl || "",
      });
      setHousehold(updated);
      setCalendarName(updated.calendarConnection?.calendarName ?? "");
      setCalendarSourceUrl(updated.calendarConnection?.sourceUrl ?? "");
      setMessage("Apple Family Calendar connected.");
    }, "Could not configure Apple Calendar.");
  }

  function onSyncCalendarEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    withParentAction(() => {
      setHousehold(
        syncAppleCalendarEvents(household, [
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
        ]),
      );
      setEventTitle("");
      setEventStartTime("09:00");
      setEventEndTime("10:00");
      setEventLocation("");
      setMessage("Apple Calendar Event synced.");
    }, "Could not sync Event.");
  }

  function saveEventParticipants(event: AgendaEvent) {
    if (!household) return;
    withParentAction(() => {
      const draft = getEventParticipantDraft(event);
      setHousehold(
        updateEventParticipants(household, {
          eventId: event.eventId,
          participantChildIds: draft.participantChildIds,
          isAllHousehold: draft.isAllHousehold,
        }),
      );
      setMessage("Event Participants updated.");
    }, "Could not update Participants.");
  }

  function getEventParticipantDraft(event: AgendaEvent): EventParticipantDraft {
    return (
      eventParticipantDrafts[event.eventId] ?? {
        isAllHousehold: event.isAllHousehold,
        participantChildIds: event.participantChildIds,
      }
    );
  }

  const todayDateKey = getTodayDateKey();
  const approvalQueue = getApprovalQueue(household);
  const parentAgenda = getParentAgenda(household);
  const parentBriefing = getParentBriefing(household, todayDateKey);
  const parentWeeklyReview = getParentWeeklyReview(household, todayDateKey);
  const choresNeedingParentHandling = household.children.flatMap((child) =>
    getChildChoreBoard(household, child.id, todayDateKey).overdue.map(
      (chore) => ({
        ...chore,
        childName: child.name,
      }),
    ),
  );
  const approvedRewardRequests = getRewardRequestsByStatus(household, "approved");
  const fulfilledRewardRequests = getRewardRequestsByStatus(
    household,
    "fulfilled",
  );
  const hasSelectedRewardRequest = getSelectedQueueItems(
    household,
    selectedApprovalIds,
  ).some((item) => item.type === "reward_request");
  const allQueueItemsSelected =
    approvalQueue.length > 0 &&
    approvalQueue.every((item) => selectedApprovalIds.includes(item.id));
  const calendarNameValue =
    calendarName || household.calendarConnection?.calendarName || "";
  const calendarSourceUrlValue =
    calendarSourceUrl || household.calendarConnection?.sourceUrl || "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ParentWorkflowHeader
        activeWorkflow={workflow}
        householdName={household.name}
      />
      <StatusMessages error={error} message={message} />

      {workflow === "today" ? (
        <div className="space-y-4">
          <TodayAgendaSection eventDays={parentBriefing.eventDays} />
          <NeedsAttentionSection briefing={parentBriefing} />
          <ApprovalQueueSection
            approvalQueue={approvalQueue}
            allQueueItemsSelected={allQueueItemsSelected}
            hasSelectedRewardRequest={hasSelectedRewardRequest}
            isPreview
            selectedApprovalIds={selectedApprovalIds}
            onApproveItem={approveQueueItem}
            onApproveSelected={approveSelectedSubmissions}
            onMarkNeedsWork={markNeedsWork}
            onRejectSelectedRewards={rejectSelectedRewardRequests}
            onSelectAll={(checked) =>
              setSelectedApprovalIds(
                checked ? approvalQueue.map((item) => item.id) : [],
              )
            }
            onSelectItem={(itemId, checked) =>
              setSelectedApprovalIds((current) =>
                checked
                  ? [...current, itemId]
                  : current.filter((candidate) => candidate !== itemId),
              )
            }
            onSkipSubmission={skipSubmissionOccurrence}
          />
          <ChoresNeedingParentHandlingSection
            chores={choresNeedingParentHandling.slice(0, 4)}
            isPreview
            onSkipOccurrence={skipOccurrence}
          />
          <RewardFulfillmentSection
            requests={approvedRewardRequests.slice(0, 4)}
            isPreview
            onFulfill={fulfillApprovedRewardRequest}
          />
          <ChildStatusSection household={household} todayDateKey={todayDateKey} />
          <WorkflowShortcuts />
        </div>
      ) : null}

      {workflow === "approvals" ? (
        <ApprovalQueueSection
          approvalQueue={approvalQueue}
          allQueueItemsSelected={allQueueItemsSelected}
          hasSelectedRewardRequest={hasSelectedRewardRequest}
          selectedApprovalIds={selectedApprovalIds}
          onApproveItem={approveQueueItem}
          onApproveSelected={approveSelectedSubmissions}
          onMarkNeedsWork={markNeedsWork}
          onRejectSelectedRewards={rejectSelectedRewardRequests}
          onSelectAll={(checked) =>
            setSelectedApprovalIds(
              checked ? approvalQueue.map((item) => item.id) : [],
            )
          }
          onSelectItem={(itemId, checked) =>
            setSelectedApprovalIds((current) =>
              checked
                ? [...current, itemId]
                : current.filter((candidate) => candidate !== itemId),
            )
          }
          onSkipSubmission={skipSubmissionOccurrence}
        />
      ) : null}

      {workflow === "chores" ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CreateChoreForm
            childId={choreChildId || household.children[0]?.id || ""}
            childOptions={household.children}
            dueDate={choreDueDate}
            pointValue={chorePointValue}
            routine={choreRoutine}
            title={choreTitle}
            onChildIdChange={setChoreChildId}
            onDueDateChange={setChoreDueDate}
            onPointValueChange={setChorePointValue}
            onRoutineChange={setChoreRoutine}
            onSubmit={onCreateChore}
            onTitleChange={setChoreTitle}
          />
          <ChoreListSection
            household={household}
            onArchive={archiveExistingChore}
            onPause={pauseExistingChore}
          />
          <div className="lg:col-span-2">
            <ChoresNeedingParentHandlingSection
              chores={choresNeedingParentHandling}
              onSkipOccurrence={skipOccurrence}
            />
          </div>
        </div>
      ) : null}

      {workflow === "goals" ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CreateGoalForm
            childId={goalChildId || household.children[0]?.id || ""}
            childOptions={household.children}
            pointValue={goalPointValue}
            title={goalTitle}
            onChildIdChange={setGoalChildId}
            onPointValueChange={setGoalPointValue}
            onSubmit={onCreateGoal}
            onTitleChange={setGoalTitle}
          />
          <GoalListSection
            household={household}
            onArchive={archiveExistingGoal}
            onComplete={completeExistingGoal}
          />
        </div>
      ) : null}

      {workflow === "rewards" ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CreateRewardForm
            pointCost={rewardPointCost}
            rewardType={rewardType}
            title={rewardTitle}
            onPointCostChange={setRewardPointCost}
            onRewardTypeChange={setRewardType}
            onSubmit={onCreateReward}
            onTitleChange={setRewardTitle}
          />
          <RewardCatalogSection
            household={household}
            rewardDrafts={rewardDrafts}
            onArchive={archiveExistingReward}
            onDraftChange={(rewardId, draft) =>
              setRewardDrafts({ ...rewardDrafts, [rewardId]: draft })
            }
            onSave={saveRewardDraft}
          />
          <div className="lg:col-span-2">
            <RewardFulfillmentSection
              requests={approvedRewardRequests}
              onFulfill={fulfillApprovedRewardRequest}
            />
          </div>
          <div className="lg:col-span-2">
            <RewardFulfillmentHistorySection requests={fulfilledRewardRequests} />
          </div>
        </div>
      ) : null}

      {workflow === "calendar" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CalendarConnectionForm
            calendarName={calendarNameValue}
            sourceUrl={calendarSourceUrlValue}
            onCalendarNameChange={setCalendarName}
            onSourceUrlChange={setCalendarSourceUrl}
            onSubmit={onConfigureCalendar}
          />
          <SyncEventForm
            canSync={Boolean(household.calendarConnection)}
            date={eventDate}
            endTime={eventEndTime}
            location={eventLocation}
            startTime={eventStartTime}
            title={eventTitle}
            onDateChange={setEventDate}
            onEndTimeChange={setEventEndTime}
            onLocationChange={setEventLocation}
            onStartTimeChange={setEventStartTime}
            onSubmit={onSyncCalendarEvent}
            onTitleChange={setEventTitle}
          />
          <div className="lg:col-span-2">
            <HouseholdAgendaSection
              agenda={parentAgenda}
              childProfiles={household.children}
              getEventParticipantDraft={getEventParticipantDraft}
              onDraftChange={(eventId, draft) =>
                setEventParticipantDrafts({
                  ...eventParticipantDrafts,
                  [eventId]: draft,
                })
              }
              onSaveParticipants={saveEventParticipants}
            />
          </div>
        </div>
      ) : null}

      {workflow === "points" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BonusPointsForm
            childId={bonusChildId || household.children[0]?.id || ""}
            childOptions={household.children}
            points={bonusPoints}
            reason={bonusReason}
            onChildIdChange={setBonusChildId}
            onPointsChange={setBonusPoints}
            onReasonChange={setBonusReason}
            onSubmit={onAwardBonusPoints}
          />
          <PointAdjustmentForm
            childId={adjustmentChildId || household.children[0]?.id || ""}
            childOptions={household.children}
            points={adjustmentPoints}
            reason={adjustmentReason}
            onChildIdChange={setAdjustmentChildId}
            onPointsChange={setAdjustmentPoints}
            onReasonChange={setAdjustmentReason}
            onSubmit={onCreatePointAdjustment}
          />
          <PointLedgerSection household={household} />
        </div>
      ) : null}

      {workflow === "household" ? (
        <HouseholdWorkflowSection
          household={household}
          childNameDrafts={childNameDrafts}
          parentEmail={parentEmail}
          parentName={parentName}
          pinDrafts={pinDrafts}
          onChildNameDraftChange={(childId, name) =>
            setChildNameDrafts({ ...childNameDrafts, [childId]: name })
          }
          onInviteParent={inviteParent}
          onParentEmailChange={setParentEmail}
          onParentNameChange={setParentName}
          onPinDraftChange={(childId, pin) =>
            setPinDrafts({ ...pinDrafts, [childId]: pin })
          }
          onSaveChildProfile={saveChildProfile}
          onSavePin={savePin}
        />
      ) : null}

      {workflow === "weekly-review" ? (
        <WeeklyReviewSection review={parentWeeklyReview} />
      ) : null}
    </div>
  );
}

function ParentWorkflowHeader({
  activeWorkflow,
  householdName,
}: {
  activeWorkflow: ParentWorkflow;
  householdName: string;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-parent">
            Parent Workflow
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {householdName}
          </h1>
        </div>
      </div>
      <nav
        aria-label="Parent workflows"
        className="flex gap-2 overflow-x-auto rounded-md border border-border bg-background p-2 shadow-panel"
      >
        {parentWorkflowNavItems.map((item) => (
          <Link
            className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-medium transition-colors ${
              item.workflow === activeWorkflow
                ? "bg-parent text-parent-foreground"
                : "hover:bg-muted"
            }`}
            href={item.href}
            key={item.workflow}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function TodayAgendaSection({ eventDays }: { eventDays: ReturnType<typeof getParentBriefing>["eventDays"] }) {
  return (
    <Section
      icon={<CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Today and Tomorrow Agenda"
      meta={`${formatDate(getTodayDateKey())} and ${formatDate(
        getTomorrowDateKey(getTodayDateKey()),
      )}`}
    >
      {eventDays.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          title="No Events today or tomorrow."
          detail="Connected Apple Calendar Events will show up here when they are near."
          href="/parent/calendar"
          action="Open Calendar"
        />
      ) : (
        <div className="space-y-4">
          {eventDays.map((day) => (
            <div className="space-y-2" key={day.date}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {formatDate(day.date)}
              </p>
              {day.events.map((event) => (
                <AgendaEventCard event={event} key={event.eventId} />
              ))}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function NeedsAttentionSection({
  briefing,
}: {
  briefing: ReturnType<typeof getParentBriefing>;
}) {
  return (
    <Section
      icon={<Sparkles aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Needs Attention"
    >
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-2">
          <BriefingMetric label="Approvals" value={briefing.approvalSummary.total} />
          <BriefingMetric label="Overdue Chores" value={briefing.overdueChores.length} />
          <BriefingMetric label="Rewards" value={briefing.unfulfilledRewards.length} />
          <BriefingMetric label="Actions" value={briefing.suggestedActions.length} />
        </div>
        <div className="space-y-2">
          {briefing.suggestedActions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
              title="No Suggested Actions right now."
              detail="Pending approvals, Overdue Chores, and Reward fulfillment will appear here."
            />
          ) : (
            briefing.suggestedActions.map((action) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                href={toWorkflowHref(action.href)}
                key={action.id}
              >
                <span>
                  <span className="block font-medium">{action.label}</span>
                  <span className="block text-muted-foreground">
                    {action.detail}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ))
          )}
        </div>
      </div>
    </Section>
  );
}

function ApprovalQueueSection({
  allQueueItemsSelected,
  approvalQueue,
  hasSelectedRewardRequest,
  isPreview = false,
  onApproveItem,
  onApproveSelected,
  onMarkNeedsWork,
  onRejectSelectedRewards,
  onSelectAll,
  onSelectItem,
  onSkipSubmission,
  selectedApprovalIds,
}: {
  allQueueItemsSelected: boolean;
  approvalQueue: ApprovalQueueItem[];
  hasSelectedRewardRequest: boolean;
  isPreview?: boolean;
  selectedApprovalIds: string[];
  onApproveItem: (item: ApprovalQueueItem) => void;
  onApproveSelected: () => void;
  onMarkNeedsWork: (item: ApprovalQueueItem) => void;
  onRejectSelectedRewards: () => void;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (itemId: string, checked: boolean) => void;
  onSkipSubmission: (submissionId: string) => void;
}) {
  const visibleQueue = isPreview ? approvalQueue.slice(0, 3) : approvalQueue;
  return (
    <Section
      action={
        isPreview ? (
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/parent/approvals">
            Open full queue
          </Link>
        ) : null
      }
      icon={<ListChecks aria-hidden="true" className="h-6 w-6 text-parent" />}
      meta={`${approvalQueue.length} waiting, ${selectedApprovalIds.length} selected`}
      title={isPreview ? "Approval Queue Preview" : "Approval Queue"}
    >
      {!isPreview ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {approvalQueue.length > 0 ? (
            <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium">
              <input
                className="h-4 w-4 rounded border-border"
                type="checkbox"
                checked={allQueueItemsSelected}
                onChange={(event) => onSelectAll(event.target.checked)}
              />
              Select all
            </label>
          ) : null}
          <Button
            type="button"
            variant="parent"
            onClick={onApproveSelected}
            disabled={selectedApprovalIds.length === 0}
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Approve selected
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRejectSelectedRewards}
            disabled={!hasSelectedRewardRequest}
          >
            <XCircle aria-hidden="true" className="h-4 w-4" />
            Reject selected Rewards
          </Button>
        </div>
      ) : null}

      {approvalQueue.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
          title="Nothing is waiting for approval."
          detail="Submitted Chores, Progress Check-ins, and Reward Requests will collect here."
          href="/parent/chores"
          action="Open Chores"
        />
      ) : (
        <div className="space-y-3">
          {visibleQueue.map((item) => {
            const selected = selectedApprovalIds.includes(item.id);
            return (
              <div
                className={`rounded-md border border-l-4 p-3 ${getApprovalQueueItemClass(item)}`}
                key={item.id}
              >
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                  <label className="flex items-start gap-3">
                    {!isPreview ? (
                      <input
                        aria-label={`Select ${getApprovalQueueItemLabel(item)} for ${item.childName}`}
                        className="mt-1 h-4 w-4 rounded border-border"
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          onSelectItem(item.id, event.target.checked)
                        }
                      />
                    ) : null}
                    <span>
                      <QueueTypeBadge item={item} />
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
                      onClick={() => onApproveItem(item)}
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkNeedsWork(item)}
                    >
                      <XCircle aria-hidden="true" className="h-4 w-4" />
                      {item.type === "reward_request" ? "Reject" : "Needs Work"}
                    </Button>
                    {item.type === "chore_submission" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSkipSubmission(item.id)}
                      >
                        <SkipForward aria-hidden="true" className="h-4 w-4" />
                        Skip
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {isPreview && approvalQueue.length > visibleQueue.length ? (
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-parent hover:underline"
              href="/parent/approvals"
            >
              {approvalQueue.length - visibleQueue.length} more waiting
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      )}
    </Section>
  );
}

function ChoresNeedingParentHandlingSection({
  chores,
  isPreview = false,
  onSkipOccurrence,
}: {
  chores: Array<ChoreOccurrence & { childName: string }>;
  isPreview?: boolean;
  onSkipOccurrence: (chore: ChoreOccurrence) => void;
}) {
  return (
    <Section
      action={
        isPreview ? (
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/parent/chores">
            Open Chores
          </Link>
        ) : null
      }
      icon={<SkipForward aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Chores Needing Parent Handling"
    >
      {chores.length === 0 ? (
        <EmptyState
          icon={<SkipForward aria-hidden="true" className="h-5 w-5" />}
          title="No Chores need Parent handling."
          detail="Overdue Chores appear here when a Parent decision is useful."
        />
      ) : (
        <div className="space-y-3">
          {chores.map((chore) => (
            <div
              className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center"
              key={`${chore.choreId}-${chore.childId}-${chore.dueDate}`}
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
                onClick={() => onSkipOccurrence(chore)}
              >
                <SkipForward aria-hidden="true" className="h-4 w-4" />
                Skip
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function RewardFulfillmentSection({
  isPreview = false,
  onFulfill,
  requests,
}: {
  isPreview?: boolean;
  onFulfill: (requestId: string) => void;
  requests: Array<{
    id: string;
    childName: string;
    contributionPoints: number;
    reservedPoints: number;
    rewardTitle: string;
  }>;
}) {
  return (
    <Section
      action={
        isPreview ? (
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/parent/rewards">
            Open Rewards
          </Link>
        ) : null
      }
      icon={<Gift aria-hidden="true" className="h-6 w-6 text-parent" />}
      title={isPreview ? "Reward Fulfillment Preview" : "Reward Fulfillment"}
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" className="h-5 w-5" />}
          title="No Rewards are waiting for fulfillment."
          detail="Approved Reward Requests stay visible until a Parent fulfills them."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              className="flex flex-col justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 p-3 sm:flex-row sm:items-center"
              key={request.id}
            >
              <div>
                <p className="font-medium">{request.rewardTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {request.childName} -{" "}
                  {request.contributionPoints + request.reservedPoints} Points
                </p>
              </div>
              <Button
                type="button"
                variant="parent"
                size="sm"
                onClick={() => onFulfill(request.id)}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Fulfill
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function RewardFulfillmentHistorySection({
  requests,
}: {
  requests: Array<{
    id: string;
    childName: string;
    contributionPoints: number;
    fulfilledAt?: string;
    reservedPoints: number;
    rewardTitle: string;
  }>;
}) {
  return (
    <Section
      icon={<Gift aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Fulfillment History"
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" className="h-5 w-5" />}
          title="No fulfilled Rewards yet."
          detail="Fulfilled Reward Requests will stay here for Parent reference."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              className="rounded-md border border-border p-3"
              key={request.id}
            >
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <p className="font-medium">{request.rewardTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.childName} -{" "}
                    {request.contributionPoints + request.reservedPoints} Points
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                  Fulfilled
                  {request.fulfilledAt
                    ? ` ${formatDate(request.fulfilledAt.slice(0, 10))}`
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ChildStatusSection({
  household,
  todayDateKey,
}: {
  household: Household;
  todayDateKey: string;
}) {
  return (
    <Section
      icon={<UserRound aria-hidden="true" className="h-6 w-6 text-child" />}
      title="Child Status"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {household.children.map((child) => {
          const choreBoard = getChildChoreBoard(household, child.id, todayDateKey);
          const goalBoard = getChildGoalBoard(household, child.id);
          const rewardBoard = getChildRewardBoard(household, child.id);
          const childStatusLink = getChildStatusWorkflowLink({
            activeGoals: goalBoard.active.length,
            overdueChores: choreBoard.overdue.length,
            pendingGoalCheckIns: goalBoard.pendingReview.length,
            pendingRewards: rewardBoard.pendingRequests.length,
            todayChores: choreBoard.today.length,
          });
          return (
            <div className="rounded-md border border-border p-3" key={child.id}>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <p className="font-medium">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {child.pointBalance} Points
                  </p>
                </div>
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium text-parent hover:underline"
                  href={childStatusLink.href}
                >
                  {childStatusLink.label}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <BriefingLine label="Today Chores" value={choreBoard.today.length} />
                <BriefingLine label="Overdue Chores" value={choreBoard.overdue.length} />
                <BriefingLine label="Active Goals" value={goalBoard.active.length} />
                <BriefingLine
                  label="Pending Rewards"
                  value={rewardBoard.pendingRequests.length}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function WorkflowShortcuts() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {parentWorkflowNavItems
        .filter((item) => item.workflow !== "today")
        .map((item) => (
          <Link
            className="rounded-md border border-border bg-background p-4 shadow-panel transition-colors hover:bg-muted"
            href={item.href}
            key={item.workflow}
          >
            <span className="font-medium">{item.label}</span>
            <span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              Open workflow <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        ))}
    </section>
  );
}

function CreateChoreForm({
  childId,
  childOptions,
  dueDate,
  onChildIdChange,
  onDueDateChange,
  onPointValueChange,
  onRoutineChange,
  onSubmit,
  onTitleChange,
  pointValue,
  routine,
  title,
}: {
  childId: string;
  childOptions: Array<{ id: string; name: string }>;
  dueDate: string;
  pointValue: string;
  routine: string;
  title: string;
  onChildIdChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onPointValueChange: (value: string) => void;
  onRoutineChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <FormSection
      icon={<ClipboardList aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Create Chore"
      onSubmit={onSubmit}
    >
      <Field label="Chore" id="chore-title">
        <Input
          className="mt-2"
          id="chore-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Unload dishwasher"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="chore-child"
          label="Child"
          value={childId}
          onChange={onChildIdChange}
          options={childOptions.map((child) => ({
            label: child.name,
            value: child.id,
          }))}
        />
        <Field label="Points" id="chore-points">
          <Input
            className="mt-2"
            id="chore-points"
            min={1}
            type="number"
            value={pointValue}
            onChange={(event) => onPointValueChange(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date" id="chore-due-date">
          <Input
            className="mt-2"
            id="chore-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
          />
        </Field>
        <SelectField
          id="chore-routine"
          label="Routine"
          value={routine}
          onChange={onRoutineChange}
          options={[
            { label: "One-time", value: "none" },
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
          ]}
        />
      </div>
      <Button className="mt-4" type="submit" variant="parent">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Chore
      </Button>
    </FormSection>
  );
}

function ChoreListSection({
  household,
  onArchive,
  onPause,
}: {
  household: Household;
  onArchive: (choreId: string) => void;
  onPause: (choreId: string) => void;
}) {
  return (
    <Section
      icon={<ClipboardList aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Chores"
    >
      {household.chores.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
          title="No Chores yet."
          detail="Create a Chore with a Child, due date, Points, and optional Routine."
        />
      ) : (
        <div className="space-y-3">
          {household.chores.map((chore) => {
            const child = household.children.find(
              (candidate) => candidate.id === chore.childId,
            );
            return (
              <div className="rounded-md border border-border p-3" key={chore.id}>
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
                      onClick={() => onPause(chore.id)}
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
                      onClick={() => onArchive(chore.id)}
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
    </Section>
  );
}

function CreateGoalForm({
  childId,
  childOptions,
  onChildIdChange,
  onPointValueChange,
  onSubmit,
  onTitleChange,
  pointValue,
  title,
}: {
  childId: string;
  childOptions: Array<{ id: string; name: string }>;
  pointValue: string;
  title: string;
  onChildIdChange: (value: string) => void;
  onPointValueChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <FormSection
      icon={<Flag aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Create Goal"
      onSubmit={onSubmit}
    >
      <Field label="Goal" id="goal-title">
        <Input
          className="mt-2"
          id="goal-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Read three books"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="goal-child"
          label="Child"
          value={childId}
          onChange={onChildIdChange}
          options={childOptions.map((child) => ({
            label: child.name,
            value: child.id,
          }))}
        />
        <Field label="Points" id="goal-points">
          <Input
            className="mt-2"
            id="goal-points"
            min={1}
            type="number"
            value={pointValue}
            onChange={(event) => onPointValueChange(event.target.value)}
          />
        </Field>
      </div>
      <Button className="mt-4" type="submit" variant="parent">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Goal
      </Button>
    </FormSection>
  );
}

function GoalListSection({
  household,
  onArchive,
  onComplete,
}: {
  household: Household;
  onArchive: (goalId: string) => void;
  onComplete: (goalId: string) => void;
}) {
  return (
    <Section
      icon={<Flag aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Goals"
    >
      {household.goals.length === 0 ? (
        <EmptyState
          icon={<Flag aria-hidden="true" className="h-5 w-5" />}
          title="No Goals yet."
          detail="Create a Child-owned Goal so Progress Check-ins can start."
        />
      ) : (
        <div className="space-y-3">
          {household.goals.map((goal) => {
            const child = household.children.find(
              (candidate) => candidate.id === goal.childId,
            );
            return (
              <div className="rounded-md border border-border p-3" key={goal.id}>
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
                      onClick={() => onComplete(goal.id)}
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Complete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onArchive(goal.id)}
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
    </Section>
  );
}

function CreateRewardForm({
  onPointCostChange,
  onRewardTypeChange,
  onSubmit,
  onTitleChange,
  pointCost,
  rewardType,
  title,
}: {
  pointCost: string;
  rewardType: string;
  title: string;
  onPointCostChange: (value: string) => void;
  onRewardTypeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <FormSection
      icon={<Gift aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Create Reward"
      onSubmit={onSubmit}
    >
      <Field label="Reward" id="reward-title">
        <Input
          className="mt-2"
          id="reward-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Allowance payout"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Point cost" id="reward-cost">
          <Input
            className="mt-2"
            id="reward-cost"
            min={1}
            type="number"
            value={pointCost}
            onChange={(event) => onPointCostChange(event.target.value)}
          />
        </Field>
        <SelectField
          id="reward-type"
          label="Type"
          value={rewardType}
          onChange={onRewardTypeChange}
          options={rewardTypeOptions}
        />
      </div>
      <Button className="mt-4" type="submit" variant="parent">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Reward
      </Button>
    </FormSection>
  );
}

function RewardCatalogSection({
  household,
  onArchive,
  onDraftChange,
  onSave,
  rewardDrafts,
}: {
  household: Household;
  rewardDrafts: Record<string, { title: string; pointCost: string; type: string }>;
  onArchive: (rewardId: string) => void;
  onDraftChange: (
    rewardId: string,
    draft: { title: string; pointCost: string; type: string },
  ) => void;
  onSave: (rewardId: string) => void;
}) {
  return (
    <Section
      icon={<Gift aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Reward Catalog"
    >
      {household.rewards.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" className="h-5 w-5" />}
          title="No Rewards yet."
          detail="Create shared Rewards with one Point cost for all Children."
        />
      ) : (
        <div className="space-y-3">
          {household.rewards.map((reward) => {
            const draft = rewardDrafts[reward.id] ?? {
              title: reward.title,
              pointCost: String(reward.pointCost),
              type: reward.type,
            };
            return (
              <div className="rounded-md border border-border p-3" key={reward.id}>
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem_9rem]">
                  <Field label="Reward" id={`${reward.id}-title`}>
                    <Input
                      className="mt-2"
                      id={`${reward.id}-title`}
                      value={draft.title}
                      disabled={reward.status !== "active"}
                      onChange={(event) =>
                        onDraftChange(reward.id, {
                          ...draft,
                          title: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Points" id={`${reward.id}-cost`}>
                    <Input
                      className="mt-2"
                      id={`${reward.id}-cost`}
                      min={1}
                      type="number"
                      value={draft.pointCost}
                      disabled={reward.status !== "active"}
                      onChange={(event) =>
                        onDraftChange(reward.id, {
                          ...draft,
                          pointCost: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <SelectField
                    id={`${reward.id}-type`}
                    label="Type"
                    value={draft.type}
                    disabled={reward.status !== "active"}
                    onChange={(type) => onDraftChange(reward.id, { ...draft, type })}
                    options={rewardTypeOptions}
                  />
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
                        onClick={() => onSave(reward.id)}
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(reward.id)}
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
    </Section>
  );
}

function CalendarConnectionForm({
  calendarName,
  onCalendarNameChange,
  onSourceUrlChange,
  onSubmit,
  sourceUrl,
}: {
  calendarName: string;
  sourceUrl: string;
  onCalendarNameChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormSection
      icon={<CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Apple Calendar"
      onSubmit={onSubmit}
    >
      <Field label="Calendar name" id="calendar-name">
        <Input
          className="mt-2"
          id="calendar-name"
          value={calendarName}
          onChange={(event) => onCalendarNameChange(event.target.value)}
          placeholder="Family"
        />
      </Field>
      <Field label="Apple source" id="calendar-source">
        <Input
          className="mt-2"
          id="calendar-source"
          value={sourceUrl}
          onChange={(event) => onSourceUrlChange(event.target.value)}
          placeholder="webcal://..."
        />
      </Field>
      <Button className="mt-4" type="submit" variant="parent">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        Save Calendar
      </Button>
    </FormSection>
  );
}

function SyncEventForm({
  canSync,
  date,
  endTime,
  location,
  onDateChange,
  onEndTimeChange,
  onLocationChange,
  onStartTimeChange,
  onSubmit,
  onTitleChange,
  startTime,
  title,
}: {
  canSync: boolean;
  date: string;
  endTime: string;
  location: string;
  startTime: string;
  title: string;
  onDateChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <FormSection
      icon={<CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Sync Apple Event"
      onSubmit={onSubmit}
    >
      <Field label="Event" id="event-title">
        <Input
          className="mt-2"
          id="event-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Soccer practice"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" id="event-date">
          <Input
            className="mt-2"
            id="event-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </Field>
        <Field label="Starts" id="event-start">
          <Input
            className="mt-2"
            id="event-start"
            type="time"
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
          />
        </Field>
        <Field label="Ends" id="event-end">
          <Input
            className="mt-2"
            id="event-end"
            type="time"
            value={endTime}
            onChange={(event) => onEndTimeChange(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Location" id="event-location">
        <Input
          className="mt-2"
          id="event-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Field 2"
        />
      </Field>
      <Button className="mt-4" type="submit" variant="parent" disabled={!canSync}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Sync Event
      </Button>
    </FormSection>
  );
}

function HouseholdAgendaSection({
  agenda,
  childProfiles,
  getEventParticipantDraft,
  onDraftChange,
  onSaveParticipants,
}: {
  agenda: ReturnType<typeof getParentAgenda>;
  childProfiles: Array<{ id: string; name: string }>;
  getEventParticipantDraft: (event: AgendaEvent) => EventParticipantDraft;
  onDraftChange: (eventId: string, draft: EventParticipantDraft) => void;
  onSaveParticipants: (event: AgendaEvent) => void;
}) {
  return (
    <Section
      icon={<CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Household Agenda"
    >
      {agenda.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          title="No synced Events yet."
          detail="Save the Apple Calendar connection, then sync a read-only Event for the Household Agenda."
        />
      ) : (
        <div className="space-y-4">
          {agenda.map((day) => (
            <div className="space-y-3" key={day.date}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {formatDate(day.date)}
              </h3>
              {day.events.map((event) => {
                const draft = getEventParticipantDraft(event);
                return (
                  <div className="rounded-md border border-border p-3" key={event.eventId}>
                    <AgendaEventCard event={event} />
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            className="h-4 w-4 rounded border-border"
                            type="checkbox"
                            checked={draft.isAllHousehold}
                            onChange={(changeEvent) =>
                              onDraftChange(event.eventId, {
                                isAllHousehold: changeEvent.target.checked,
                                participantChildIds: [],
                              })
                            }
                          />
                          All Household
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {childProfiles.map((child) => (
                            <label className="flex items-center gap-2 text-sm" key={child.id}>
                              <input
                                className="h-4 w-4 rounded border-border"
                                type="checkbox"
                                disabled={draft.isAllHousehold}
                                checked={draft.participantChildIds.includes(child.id)}
                                onChange={(changeEvent) =>
                                  onDraftChange(event.eventId, {
                                    isAllHousehold: false,
                                    participantChildIds: changeEvent.target.checked
                                      ? [...draft.participantChildIds, child.id]
                                      : draft.participantChildIds.filter(
                                          (candidate) => candidate !== child.id,
                                        ),
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
                        onClick={() => onSaveParticipants(event)}
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
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
    </Section>
  );
}

function BonusPointsForm({
  childId,
  childOptions,
  onChildIdChange,
  onPointsChange,
  onReasonChange,
  onSubmit,
  points,
  reason,
}: {
  childId: string;
  childOptions: Array<{ id: string; name: string }>;
  points: string;
  reason: string;
  onChildIdChange: (value: string) => void;
  onPointsChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormSection
      icon={<Sparkles aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Bonus Points"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="bonus-child"
          label="Child"
          value={childId}
          onChange={onChildIdChange}
          options={childOptions.map((child) => ({
            label: child.name,
            value: child.id,
          }))}
        />
        <Field label="Points" id="bonus-points">
          <Input
            className="mt-2"
            id="bonus-points"
            min={1}
            type="number"
            value={points}
            onChange={(event) => onPointsChange(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Reason" id="bonus-reason">
        <Input
          className="mt-2"
          id="bonus-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Helped without being asked"
        />
      </Field>
      <Button className="mt-4" type="submit" variant="parent">
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        Award Bonus
      </Button>
    </FormSection>
  );
}

function PointAdjustmentForm({
  childId,
  childOptions,
  onChildIdChange,
  onPointsChange,
  onReasonChange,
  onSubmit,
  points,
  reason,
}: {
  childId: string;
  childOptions: Array<{ id: string; name: string }>;
  points: string;
  reason: string;
  onChildIdChange: (value: string) => void;
  onPointsChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormSection
      icon={<WalletCards aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Point Adjustment"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="adjustment-child"
          label="Child"
          value={childId}
          onChange={onChildIdChange}
          options={childOptions.map((child) => ({
            label: child.name,
            value: child.id,
          }))}
        />
        <Field label="Point change" id="adjustment-points">
          <Input
            className="mt-2"
            id="adjustment-points"
            type="number"
            value={points}
            onChange={(event) => onPointsChange(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Reason" id="adjustment-reason">
        <Input
          className="mt-2"
          id="adjustment-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Corrected duplicate entry"
        />
      </Field>
      <Button className="mt-4" type="submit" variant="parent">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        Record Adjustment
      </Button>
    </FormSection>
  );
}

function PointLedgerSection({
  household,
}: {
  household: Household;
}) {
  return (
    <Section
      icon={<WalletCards aria-hidden="true" className="h-6 w-6 text-parent" />}
      title="Point Balances"
    >
      <div className="space-y-3">
        {household.children.map((child) => {
          const entries = household.pointLedger
            .filter((entry) => entry.childId === child.id)
            .slice(-5)
            .reverse();
          return (
            <div className="rounded-md border border-border p-3" key={child.id}>
              <p className="font-medium">{child.name}</p>
              <p className="text-sm text-muted-foreground">
                {child.pointBalance} Points
              </p>
              {entries.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {entries.map((entry) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm"
                      key={entry.id}
                    >
                      <span>{entry.description}</span>
                      <span className="font-semibold">
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function HouseholdWorkflowSection({
  childNameDrafts,
  household,
  onChildNameDraftChange,
  onInviteParent,
  onParentEmailChange,
  onParentNameChange,
  onPinDraftChange,
  onSaveChildProfile,
  onSavePin,
  parentEmail,
  parentName,
  pinDrafts,
}: {
  childNameDrafts: Record<string, string>;
  household: Household;
  parentEmail: string;
  parentName: string;
  pinDrafts: Record<string, string>;
  onChildNameDraftChange: (childId: string, name: string) => void;
  onInviteParent: (event: FormEvent<HTMLFormElement>) => void;
  onParentEmailChange: (email: string) => void;
  onParentNameChange: (name: string) => void;
  onPinDraftChange: (childId: string, pin: string) => void;
  onSaveChildProfile: (childId: string) => void;
  onSavePin: (childId: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section
        icon={<ShieldCheck aria-hidden="true" className="h-6 w-6 text-parent" />}
        title="Parents"
      >
        <div className="space-y-3">
          {household.parents.map((parent) => (
            <div className="rounded-md border border-border p-3" key={parent.id}>
              <p className="font-medium">{parent.name}</p>
              <p className="text-sm text-muted-foreground">{parent.email}</p>
            </div>
          ))}
        </div>
        <form className="mt-4 space-y-3" onSubmit={onInviteParent}>
          <Field label="Parent name" id="new-parent-name">
            <Input
              className="mt-2"
              id="new-parent-name"
              value={parentName}
              onChange={(event) => onParentNameChange(event.target.value)}
            />
          </Field>
          <Field label="Parent email" id="new-parent-email">
            <Input
              className="mt-2"
              id="new-parent-email"
              type="email"
              value={parentEmail}
              onChange={(event) => onParentEmailChange(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="parent">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Parent
          </Button>
        </form>
      </Section>
      <div className="lg:col-span-2">
        <Section
          icon={<UserRound aria-hidden="true" className="h-6 w-6 text-child" />}
          title="Children and PINs"
        >
          <div className="space-y-4">
            {household.children.map((child) => (
              <div
                className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto]"
                key={child.id}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <Field label="Child name" id={`${child.id}-name`}>
                    <Input
                      className="mt-2"
                      id={`${child.id}-name`}
                      value={childNameDrafts[child.id] ?? child.name}
                      onChange={(event) =>
                        onChildNameDraftChange(child.id, event.target.value)
                      }
                    />
                  </Field>
                  <Field label="New Child PIN" id={`${child.id}-pin`}>
                    <Input
                      className="mt-2"
                      id={`${child.id}-pin`}
                      inputMode="numeric"
                      maxLength={8}
                      value={pinDrafts[child.id] ?? ""}
                      onChange={(event) =>
                        onPinDraftChange(child.id, event.target.value)
                      }
                    />
                  </Field>
                  <p className="text-sm text-muted-foreground">
                    {child.pointBalance} Points
                    {child.sessionVersion ? ` - Session v${child.sessionVersion}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2 self-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSaveChildProfile(child.id)}
                  >
                    Save Profile
                  </Button>
                  <Button
                    type="button"
                    variant="parent"
                    onClick={() => onSavePin(child.id)}
                  >
                    <KeyRound aria-hidden="true" className="h-4 w-4" />
                    Update PIN
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <Link
        className="rounded-md border border-border bg-child p-5 text-child-foreground shadow-panel transition-colors hover:bg-child/90 lg:col-span-3"
        href="/child"
      >
        <h2 className="text-lg font-semibold">Open Child View</h2>
        <p className="mt-2 text-sm text-child-foreground/80">
          Select a Child profile and enter the Child PIN.
        </p>
      </Link>
    </div>
  );
}

function WeeklyReviewSection({
  review,
}: {
  review: ReturnType<typeof getParentWeeklyReview>;
}) {
  return (
    <Section
      icon={<CalendarDays aria-hidden="true" className="h-6 w-6 text-parent" />}
      meta={`${formatDate(review.startsOn)} through ${formatDate(review.endsOn)}`}
      title="Weekly Review"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <BriefingMetric
          label="Week Events"
          value={review.eventDays.reduce(
            (total, day) => total + day.events.length,
            0,
          )}
        />
        <BriefingMetric label="Pending Requests" value={review.pendingRewardRequests.length} />
        <BriefingMetric label="Unfulfilled" value={review.unfulfilledRewards.length} />
        <BriefingMetric label="Children" value={review.childSummaries.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyEventsPanel review={review} />
        <WeeklyChildProgressPanel review={review} />
        <WeeklyRewardPanel
          emptyActionHref="/parent/approvals"
          emptyActionLabel="Open Approval Queue"
          emptyDetail="When a Child requests a Reward, it will be linked here and added to the Approval Queue."
          emptyTitle="No Reward Requests waiting."
          rewards={review.pendingRewardRequests}
          title="Pending Reward Requests"
        />
        <WeeklyRewardPanel
          emptyActionHref="/parent/rewards"
          emptyActionLabel="Open Fulfillment"
          emptyDetail="Approved Reward Requests stay visible until a Parent marks them fulfilled."
          emptyTitle="No Rewards need fulfillment."
          rewards={review.unfulfilledRewards}
          title="Unfulfilled Rewards"
        />
      </div>
    </Section>
  );
}

function WeeklyEventsPanel({
  review,
}: {
  review: ReturnType<typeof getParentWeeklyReview>;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays aria-hidden="true" className="h-5 w-5 text-parent" />
        <h3 className="font-semibold">Upcoming Week Events</h3>
      </div>
      {review.eventDays.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          title="No synced Events in the upcoming week."
          detail="Save the Apple Calendar connection and sync Events to fill the week."
          href="/parent/calendar"
          action="Open Calendar"
        />
      ) : (
        <div className="space-y-3">
          {review.eventDays.map((day) => (
            <div className="space-y-2" key={day.date}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {formatDate(day.date)}
              </p>
              {day.events.map((event) => (
                <AgendaEventCard event={event} key={event.eventId} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklyChildProgressPanel({
  review,
}: {
  review: ReturnType<typeof getParentWeeklyReview>;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserRound aria-hidden="true" className="h-5 w-5 text-child" />
        <h3 className="font-semibold">Child Progress</h3>
      </div>
      <div className="space-y-3">
        {review.childSummaries.map((summary) => (
          <div className="rounded-md border border-border p-3" key={summary.childId}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div>
                <p className="font-medium">{summary.childName}</p>
                <p className="text-sm text-muted-foreground">
                  {summary.pointBalance} Points
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <Link className="rounded-md bg-muted px-2 py-1 transition-colors hover:bg-muted/70" href="/parent/chores">
                  {summary.chores.dueThisWeek} due
                </Link>
                <Link className="rounded-md bg-muted px-2 py-1 transition-colors hover:bg-muted/70" href="/parent/goals">
                  {summary.goals.active} Goals
                </Link>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <BriefingLine label="Overdue Chores" value={summary.chores.overdue} />
              <BriefingLine
                label="Pending Review"
                value={summary.chores.pendingReview + summary.goals.pendingCheckIns}
              />
              <BriefingLine label="Completed Goals" value={summary.goals.completed} />
              <BriefingLine
                label="Reward Requests"
                value={summary.rewardRequests.pending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyRewardPanel({
  emptyActionHref,
  emptyActionLabel,
  emptyDetail,
  emptyTitle,
  rewards,
  title,
}: {
  emptyActionHref: string;
  emptyActionLabel: string;
  emptyDetail: string;
  emptyTitle: string;
  rewards: ReturnType<typeof getParentWeeklyReview>["pendingRewardRequests"];
  title: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gift aria-hidden="true" className="h-5 w-5 text-parent" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {rewards.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" className="h-5 w-5" />}
          title={emptyTitle}
          detail={emptyDetail}
          href={emptyActionHref}
          action={emptyActionLabel}
        />
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              href="/parent/rewards"
              key={reward.requestId}
            >
              <span>
                <span className="block font-medium">{reward.title}</span>
                <span className="block text-muted-foreground">
                  {reward.childName} - {reward.points} Points
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ParentSetupState() {
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

function Section({
  action,
  children,
  icon,
  meta,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  meta?: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-border bg-background p-5 shadow-panel">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {meta ? <p className="mt-1 text-sm text-muted-foreground">{meta}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FormSection({
  children,
  icon,
  onSubmit,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="rounded-md border border-border bg-background p-5 shadow-panel"
      onSubmit={onSubmit}
    >
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </form>
  );
}

function Field({
  children,
  id,
  label,
}: {
  children: ReactNode;
  id: string;
  label: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  disabled = false,
  id,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <select
        className="mt-2 flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function AgendaEventCard({ event }: { event: AgendaEvent }) {
  const needsAttention = eventNeedsParentAttention(event);
  return (
    <div
      className={`rounded-md border p-3 ${
        needsAttention ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
            {event.location ? ` - ${event.location}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.participantNames.length > 0
              ? event.participantNames.join(", ")
              : "Participants need review"}
          </p>
        </div>
        {needsAttention ? (
          <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
            Review Participants
          </span>
        ) : (
          <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}

function StatusMessages({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  if (!message && !error) return null;
  return (
    <div className="mb-4 space-y-2">
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({
  action,
  detail,
  href,
  icon,
  title,
}: {
  action?: string;
  detail: string;
  href?: string;
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
          {href && action ? (
            <Link
              className="mt-3 inline-flex items-center gap-2 rounded-md text-sm font-medium text-parent hover:underline"
              href={href}
            >
              {action}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BriefingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function BriefingLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
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
  household: Household,
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
    ? "border-blue-200 border-l-blue-600 bg-blue-50"
    : item.type === "progress_check_in"
      ? "border-emerald-200 border-l-emerald-600 bg-emerald-50"
      : "border-violet-200 border-l-violet-600 bg-violet-50";
}

function QueueTypeBadge({ item }: { item: ApprovalQueueItem }) {
  const className =
    item.type === "chore_submission"
      ? "bg-blue-100 text-blue-800"
      : item.type === "progress_check_in"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-violet-100 text-violet-800";

  return (
    <span
      className={`mb-1 inline-flex rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-normal ${className}`}
    >
      {getApprovalQueueItemLabel(item)}
    </span>
  );
}

function getRewardRequestsByStatus(
  household: Household,
  status: "approved" | "fulfilled",
) {
  return household.rewardRequests
    .filter((request) => request.status === status)
    .flatMap((request) => {
      const reward = household.rewards.find(
        (candidate) => candidate.id === request.rewardId,
      );
      const child = household.children.find(
        (candidate) => candidate.id === request.childId,
      );
      if (!reward || !child) return [];
      return [{ ...request, rewardTitle: reward.title, childName: child.name }];
    });
}

export function eventNeedsParentAttention(event: AgendaEvent): boolean {
  return (
    event.participantNames.length === 0 ||
    event.isAllHousehold ||
    (!event.isAllHousehold && event.participantChildIds.length === 0)
  );
}

export function getChildStatusWorkflowLink(input: {
  activeGoals: number;
  overdueChores: number;
  pendingGoalCheckIns: number;
  pendingRewards: number;
  todayChores: number;
}): { href: string; label: string } {
  if (input.pendingRewards > 0) {
    return { href: "/parent/rewards", label: "Open Rewards" };
  }
  if (input.pendingGoalCheckIns > 0 || input.activeGoals > 0) {
    return { href: "/parent/goals", label: "Open Goals" };
  }
  if (input.overdueChores > 0 || input.todayChores > 0) {
    return { href: "/parent/chores", label: "Open Chores" };
  }
  return { href: "/parent/points", label: "Open Points" };
}

function toWorkflowHref(anchorHref: string): string {
  if (anchorHref === "#approval-queue") return "/parent/approvals";
  if (anchorHref === "#due-chores") return "/parent/chores";
  if (anchorHref === "#reward-fulfillment") return "/parent/rewards";
  return "/parent";
}

function toRewardType(value: string) {
  return value === "allowance" ||
    value === "experience" ||
    value === "privilege" ||
    value === "custom"
    ? value
    : "custom";
}

const rewardTypeOptions = [
  { label: "Allowance", value: "allowance" },
  { label: "Experience", value: "experience" },
  { label: "Privilege", value: "privilege" },
  { label: "Custom", value: "custom" },
];
