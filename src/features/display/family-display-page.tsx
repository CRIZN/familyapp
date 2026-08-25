import Link from "next/link";
import { CalendarDays, ListChecks } from "lucide-react";

import type {
  FamilyDisplayCalendarStatus,
  FamilyDisplayChoreStatus,
  FamilyDisplaySnapshot,
} from "@/domain/family-display";

import { FamilyDisplayClock } from "./family-display-clock";
import { FamilyDisplayRefresh } from "./family-display-refresh";

const CHORE_STATUS_LABEL: Record<FamilyDisplayChoreStatus, string> = {
  due: "Due",
  overdue: "Overdue",
  pending_review: "Pending review",
  done: "Done",
};

export function FamilyDisplayPage({
  snapshot,
}: {
  snapshot: FamilyDisplaySnapshot | null;
}) {
  if (!snapshot) {
    return <FamilyDisplayUnavailable />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <FamilyDisplayRefresh />
      <header className="flex flex-col gap-6 border-b border-zinc-800 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Family Display
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {snapshot.householdName}
          </h1>
          <p className="text-lg text-zinc-400">{calendarStatusLine(snapshot.calendarStatus)}</p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-end">
          <FamilyDisplayClock />
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-zinc-600 px-4 text-base font-medium text-zinc-100 hover:bg-zinc-900"
            href="/parent"
          >
            Exit
          </Link>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <AgendaPanel snapshot={snapshot} />
        <ChoresPanel snapshot={snapshot} />
      </div>
    </div>
  );
}

function AgendaPanel({ snapshot }: { snapshot: FamilyDisplaySnapshot }) {
  return (
    <section aria-labelledby="family-display-agenda">
      <div className="mb-5 flex items-center gap-3">
        <CalendarDays aria-hidden="true" className="h-8 w-8 text-zinc-300" />
        <h2 className="text-3xl font-semibold" id="family-display-agenda">
          Today
        </h2>
      </div>
      {snapshot.agenda.length === 0 ? (
        <EmptyDisplayState
          title={
            snapshot.calendarStatus.state === "not_connected"
              ? "No calendar connected."
              : "No Events today."
          }
          detail={
            snapshot.calendarStatus.state === "not_connected"
              ? "Connect the Family Calendar from Parent View when you want the Agenda here."
              : "Nothing is on the Family Calendar for today."
          }
        />
      ) : (
        <ol className="space-y-4">
          {snapshot.agenda.map((event) => (
            <li
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4"
              key={event.eventId}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {event.timeLabel}
              </p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">{event.title}</p>
              {event.location ? (
                <p className="mt-2 text-lg text-zinc-300">{event.location}</p>
              ) : null}
              <p className="mt-2 text-lg text-zinc-400">{event.participantLabel}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ChoresPanel({ snapshot }: { snapshot: FamilyDisplaySnapshot }) {
  const hasAnyChores = snapshot.children.some((child) => child.chores.length > 0);

  return (
    <section aria-labelledby="family-display-chores">
      <div className="mb-5 flex items-center gap-3">
        <ListChecks aria-hidden="true" className="h-8 w-8 text-zinc-300" />
        <h2 className="text-3xl font-semibold" id="family-display-chores">
          Chores
        </h2>
      </div>
      {snapshot.children.length === 0 ? (
        <EmptyDisplayState
          title="No Children in this Household."
          detail="Add a Child from Household setup to show today's Chores here."
        />
      ) : !hasAnyChores ? (
        <EmptyDisplayState
          title="No chores today."
          detail="Due and Overdue Chores will show here, grouped by Child."
        />
      ) : (
        <div className="space-y-6">
          {snapshot.children.map((child) => (
            <div key={child.childId}>
              <h3 className="text-2xl font-semibold sm:text-3xl">{child.name}</h3>
              {child.chores.length === 0 ? (
                <p className="mt-3 text-lg text-zinc-400">No chores today.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {child.chores.map((chore) => (
                    <li
                      className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      key={`${chore.choreId}:${chore.dueDate}:${chore.status}`}
                    >
                      <p className="text-xl font-medium sm:text-2xl">{chore.title}</p>
                      <span
                        className={`inline-flex min-h-9 items-center rounded-md px-3 text-base font-semibold ${choreStatusClass(chore.status)}`}
                      >
                        {CHORE_STATUS_LABEL[chore.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FamilyDisplayUnavailable() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 px-4 py-10 text-zinc-50">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-3xl font-semibold">Family Display</h1>
        <p className="mt-3 text-lg text-zinc-300">
          Create the Household before leaving this screen on a kitchen tablet.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-md border border-zinc-600 px-4 text-base font-medium text-zinc-100 hover:bg-zinc-800"
          href="/parent"
        >
          Exit
        </Link>
      </div>
    </div>
  );
}

function EmptyDisplayState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-8">
      <p className="text-2xl font-semibold">{title}</p>
      <p className="mt-3 text-lg text-zinc-400">{detail}</p>
    </div>
  );
}

function calendarStatusLine(status: FamilyDisplayCalendarStatus): string {
  if (status.state === "not_connected") {
    return "Family Calendar is not connected.";
  }
  if (!status.lastSuccessfulSyncAt) {
    return `${status.calendarName} is connected.`;
  }
  return `${status.calendarName} last synced ${formatOptionalDateTime(status.lastSuccessfulSyncAt)}.`;
}

function formatOptionalDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function choreStatusClass(status: FamilyDisplayChoreStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-500 text-white";
    case "due":
      return "bg-sky-400 text-zinc-950";
    case "pending_review":
      return "bg-amber-400 text-zinc-950";
    case "done":
      return "bg-emerald-500 text-zinc-950";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
