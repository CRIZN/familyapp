ALTER TABLE "point_ledger" DROP CONSTRAINT "point_ledger_delta_non_zero";--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_delta_non_zero" CHECK ("delta" <> 0 OR "source_type" = 'reward_request_approval_spend');--> statement-breakpoint
