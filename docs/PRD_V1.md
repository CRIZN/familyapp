# Family App v1 Product Brief

## Purpose

Family App helps one Household coordinate what is happening, what Children need to do, what Parents need to review, and what Children have earned. V1 is a responsive web app for the family, not a general-purpose household platform.

## Primary Users

- Parents use Parent View to manage the Household, review the Agenda and Briefing, manage Chores, Goals, Rewards, and approve child requests.
- Children use Child View to see today's work, submit Chores and Progress Check-ins, view Points, contribute toward Rewards, request Rewards, and see Wins.

## V1 Scope

### Household Setup

Parents can create the Household, add Parents and Children, set Child PINs, connect the shared Apple Family Calendar, create starter Chores, and create starter Rewards.

### Calendar Awareness

Family App syncs Events read-only from the shared Apple Family Calendar. Apple Calendar remains the source of truth for Event creation and edits. Parents can enrich synced Events inside Family App by adjusting Participants. Parent View shows the full day-first Agenda. Child View shows Events where that Child is a Participant, plus all-Household Events when relevant.

### Parent Briefing and Weekly Review

Parent View includes a Briefing with upcoming Events, pending Approval Queue items, Overdue Chores, unfulfilled Rewards, and rule-based Suggested Actions. Parent View also includes a Weekly Review for the upcoming week, child progress, Point Balances, and pending requests.

### Chores

Parents create Chores assigned to exactly one Child. A Chore has its own Point value and can be one-time or recurring through a Routine. Children submit completed Chores. Parents approve, mark Needs Work, Skip a Chore occurrence, Pause expected occurrences, or Archive inactive Chores. Missed Chores become Overdue until submitted, approved, skipped, or otherwise handled by a Parent.

### Goals

Parents create Goals assigned to exactly one Child. A Goal has its own Point value. Children submit Progress Check-ins. Parents approve or mark Needs Work. Parents can mark Goal Completion, which may award remaining Points. V1 uses plain Goals with Progress Check-ins, not specialized numeric or habit goal engines.

### Points

Each Child has one Point Balance and a visible Point Ledger. Points can be earned through approved Chore Submissions, approved Progress Check-ins, Goal Completion, Bonus Points, and Point Adjustments. V1 does not use Points as penalties. Parents can create positive or negative Point Adjustments with a required reason; negative adjustments are corrections, not consequences.

### Rewards

Parents manage one shared Reward Catalog. Each Reward has one shared Point cost for all Children. Allowance is a cash Reward, not an automatic payout. Children can make Reward Contributions before they have the full Point cost; contributions reduce available Point Balance and can be returned by the Child until a Reward Request is submitted. Reward Requests require enough committed or available Points, require Parent approval, reserve Points while pending, and have separate Fulfillment after approval.

### Child View

Child View is today-first, with upcoming Chores and Goals visible. Children can see their Point Balance, simplified Point Ledger, Reward Catalog, Reward Contributions, Reward Requests, and Wins history. Children access Child View through Parent-managed Child PINs.

### Approval Queue

Parent View has one combined Approval Queue for Chore Submissions, Progress Check-ins, and Reward Requests. Queue items must be visually easy to distinguish by type and must support batch-friendly review.

## Out of Scope for V1

- Two-way Apple Calendar editing
- Manual in-app Event creation as the main calendar source of truth
- Push, email, or text notifications
- AI suggestions or summaries
- Shopping lists or general household lists
- Messaging, comments, submission notes, photos, or attachments
- Consequence tracking or punitive Point deductions
- Streak tracking
- Chore templates
- Parent-assigned Chores for Parents
- Shared Chores or shared Goals across multiple Children
- Household-wide Goals
- Per-child Reward pricing or Reward availability
- Child reward Wishes separate from Reward Contributions
- Family Display Mode
- Parent-only private notes
- Optional extra Chore Opportunities

## Durable Decisions

- V1 is a responsive web app.
- The app is for exactly one Household per Parent account.
- Parents have equal household-admin permissions.
- Children use Child PINs rather than email/password accounts.
- Apple Calendar is read-only and remains the source of truth for Events.
- The reward economy uses one Points system per Child.

## Success Criteria

- Parents can understand today's household situation from the Briefing without checking several places.
- Children can independently see what to do, submit work, understand their Points, and request or contribute toward Rewards.
- Parents can review child requests quickly from one Approval Queue.
- Point Balance changes are explainable from the Point Ledger.
- The app feels motivating and transparent rather than punitive.
