# Point Ledger is authoritative

Family App treats the Point Ledger as the source of truth for explaining every Point Balance change. A denormalized Point Balance may be stored for fast reads, but it must be updated in the same transaction as the ledger entry so earned, reserved, returned, spent, adjusted, and bonus Points remain explainable.
