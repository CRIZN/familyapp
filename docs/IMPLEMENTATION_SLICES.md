# Family App v1 Implementation Slices

These slices break the v1 product brief into independently grabbable tracer bullets. Each slice should be demoable end-to-end across persistence, domain behavior, API/actions, UI, and tests.

## Proposed Order

### 1. App Shell and Household Setup Tracer - Done

**Blocked by**: None

**User stories covered**:
- As a Parent, I can create the Household.
- As a Parent, I can add Parents and Children.
- As a Parent, I can create Child PINs.
- As a Parent or Child, I can enter the correct view for my role.

**What to build**:
Create the responsive web app foundation with Parent View and Child View routes, a minimal persistent Household model, equal Parent permissions, Child PIN access, and Household Setup for adding the first Parents and Children.

**Acceptance criteria**:
- [x] A Parent can complete Household Setup with at least one Parent and one Child.
- [x] A Parent can create or update a Child PIN.
- [x] A Child can enter Child View using their PIN.
- [x] Parent View and Child View are visually distinct and responsive.
- [x] Tests cover Household Setup and Child PIN access behavior.

### 2. Chore Creation to Child Submission Tracer - Done

**Blocked by**: Slice 1

**User stories covered**:
- As a Parent, I can create a Chore for one Child.
- As a Child, I can see today's and upcoming Chores.
- As a Child, I can submit a completed Chore.

**What to build**:
Let Parents create one-time and recurring Chores assigned to exactly one Child, then show those Chores in a today-first Child View where the Child can create a Chore Submission.

**Acceptance criteria**:
- [x] A Parent can create a Chore with Child, Point value, due date, and optional Routine.
- [x] Child View shows today's Chores first and upcoming Chores separately.
- [x] A Child can submit an assigned Chore for review.
- [x] Missed due Chores become Overdue.
- [x] Tests cover one-time Chores, recurring Chores, Child ownership, submission, and Overdue behavior.

### 3. Approval Queue Awards Points for Chores - Done

**Blocked by**: Slice 2

**User stories covered**:
- As a Parent, I can review Chore Submissions in one Approval Queue.
- As a Parent, I can approve, mark Needs Work, Skip, Pause, or Archive Chores.
- As a Child, I can see earned Points and Wins after approval.

**What to build**:
Add the combined Approval Queue starting with Chore Submissions, including type-distinct queue rows, batch-friendly approval, Needs Work, Skip, Pause, Archive, Point Balance updates, Point Ledger entries, and Child Wins for approved Chores.

**Acceptance criteria**:
- [x] Parent View shows pending Chore Submissions in the Approval Queue.
- [x] A Parent can approve one or more Chore Submissions and award Points.
- [x] A Parent can mark a submission Needs Work without awarding Points.
- [x] A Parent can Skip a Chore occurrence without awarding Points.
- [x] A Parent can Pause expected Chore occurrences and Archive inactive Chores.
- [x] Child View shows updated Point Balance, simplified Point Ledger, and Wins.
- [x] Tests cover approval, Needs Work, Skip, Pause, Archive, ledger entries, and batch approval.

### 4. Goals and Progress Check-ins - Done

**Blocked by**: Slice 1, Slice 3

**User stories covered**:
- As a Parent, I can create a Goal for one Child.
- As a Child, I can submit Progress Check-ins.
- As a Parent, I can approve progress or mark it Needs Work.
- As a Parent, I can mark Goal Completion.

**What to build**:
Add plain Child-owned Goals with Point values, Progress Check-ins in Child View, Approval Queue support for check-ins, Point Ledger updates, Wins, and Parent-marked Goal Completion.

**Acceptance criteria**:
- [x] A Parent can create and Archive a Goal for one Child.
- [x] A Child can submit a Progress Check-in for an active Goal.
- [x] The Approval Queue distinguishes Progress Check-ins from Chore Submissions.
- [x] Approved Progress Check-ins can award Points and create Point Ledger entries.
- [x] Needs Work sends a Progress Check-in back without awarding Points.
- [x] Goal Completion can award remaining Points and appear in Wins.
- [x] Tests cover Goal ownership, check-in approval, Needs Work, completion, ledger entries, and Wins.

### 5. Reward Catalog, Contributions, Requests, and Fulfillment - Done

**Blocked by**: Slice 3

**User stories covered**:
- As a Parent, I can create shared Rewards with one Point cost.
- As a Child, I can contribute Points toward a Reward.
- As a Child, I can request a Reward when enough Points are committed or available.
- As a Parent, I can approve and fulfill Reward Requests.

**What to build**:
Add the shared Reward Catalog, Allowance as a normal Reward type, Reward Contributions, child-reversible contributions before request, Reward Requests with Reserved Points, Approval Queue support for requests, and separate Fulfillment after approval.

**Acceptance criteria**:
- [x] A Parent can create, edit, and Archive shared Rewards with one Point cost.
- [x] A Child can contribute available Points toward a Reward.
- [x] A Child can return Reward Contributions before submitting a Reward Request.
- [x] A Reward Request reserves Points while pending and prevents double-spend.
- [x] Approval spends Points; rejection or cancellation returns Reserved Points.
- [x] Fulfillment is tracked separately after approval.
- [x] The Approval Queue visually distinguishes Reward Requests from other item types.
- [x] Tests cover contributions, returns, reservation, approval, rejection/cancellation, fulfillment, and ledger entries.

### 6. Bonus Points and Point Adjustments - Done

**Blocked by**: Slice 3

**User stories covered**:
- As a Parent, I can award Bonus Points.
- As a Parent, I can make positive or negative Point Adjustments with reasons.
- As a Child, I can understand why my Point Balance changed.

**What to build**:
Add Parent flows for Bonus Points and Point Adjustments, requiring a reason for adjustments and recording every change in the Point Ledger. Negative adjustments are corrections, not penalties.

**Acceptance criteria**:
- [x] A Parent can award Bonus Points to a Child.
- [x] A Parent can create a positive or negative Point Adjustment with a required reason.
- [x] The Point Ledger clearly labels Bonus Points and Point Adjustments.
- [x] Child View shows a simplified explanation of each Point change.
- [x] Tests cover Bonus Points, required adjustment reasons, negative corrections, and ledger visibility.

### 7. Read-only Apple Calendar Agenda with Event Enrichment - Done

**Blocked by**: Slice 1

**User stories covered**:
- As a Parent, I can connect the shared Apple Family Calendar.
- As a Parent, I can see the full day-first Household Agenda.
- As a Parent, I can adjust Participants for synced Events.
- As a Child, I can see Events where I am a Participant.

**What to build**:
Add read-only Family Calendar sync using Apple Calendar as the source of truth for Events, then layer Event Enrichment for Participants inside Family App. Parent View shows the full Agenda; Child View shows relevant Events.

**Acceptance criteria**:
- [x] A Parent can connect or configure the shared Apple Family Calendar.
- [x] Synced Events are read-only in Family App.
- [x] Parent View shows a day-first Agenda with Participants.
- [x] A Parent can manually adjust Participants through Event Enrichment.
- [x] Child View shows that Child's Events and all-Household Events when relevant.
- [x] Tests cover read-only Event behavior, Participant enrichment, Parent Agenda, and Child Agenda filtering.

### 8. Parent Briefing and Suggested Actions - Done

**Blocked by**: Slice 3, Slice 5, Slice 7

**User stories covered**:
- As a Parent, I can understand today's household situation from one Briefing.
- As a Parent, I can see Suggested Actions for items that need attention.

**What to build**:
Build the Parent Briefing from existing app state: upcoming Events, pending Approval Queue items, Overdue Chores, unfulfilled Rewards, and rule-based Suggested Actions.

**Acceptance criteria**:
- [x] Briefing shows today's and tomorrow's important Events.
- [x] Briefing summarizes pending Approval Queue items by type.
- [x] Briefing highlights Overdue Chores and unfulfilled Rewards.
- [x] Suggested Actions are rule-based and link to the relevant workflow.
- [x] Tests cover Briefing content and Suggested Action rules.

### 9. Weekly Review - Done

**Blocked by**: Slice 4, Slice 5, Slice 7, Slice 8

**User stories covered**:
- As a Parent, I can review the upcoming week.
- As a Parent, I can review child progress, Point Balances, and pending requests.

**What to build**:
Add the Parent Weekly Review for the upcoming week of Events, child Chore and Goal progress, Point Balances, pending Reward Requests, and unfulfilled Rewards.

**Acceptance criteria**:
- [x] Weekly Review shows upcoming week Events from the Family Calendar.
- [x] Weekly Review summarizes Chores, Overdue Chores, Goals, Point Balances, pending Reward Requests, and unfulfilled Rewards.
- [x] Weekly Review links back into the relevant Parent workflows.
- [x] Tests cover Weekly Review aggregation and empty states.

### 10. V1 Polish, Empty States, and Installable Quality Pass

**Blocked by**: Slices 1-9

**User stories covered**:
- As a Parent or Child, I can use the app comfortably on phone, tablet, or desktop.
- As a family, the app feels motivating, clear, and non-punitive.

**What to build**:
Harden responsive layouts, empty states, accessibility, loading/error states, visual distinction in queue items, and copy tone across Parent View and Child View.

**Acceptance criteria**:
- [ ] Parent View and Child View are usable on common mobile, tablet, and desktop widths.
- [ ] Empty states guide Parents and Children toward the next useful action.
- [ ] Approval Queue item types are visually distinct and batch-friendly.
- [ ] Point Ledger and Wins feel clear and encouraging for Children.
- [ ] Accessibility checks pass for keyboard navigation, labels, contrast, and focus states.
- [ ] Smoke tests cover the full v1 happy path.
