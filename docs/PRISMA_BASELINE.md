# Prisma Baseline

## Current State

`20260823000000_init_existing_supabase` is the baseline for the pre-existing
Supabase `public` schema. It was generated with Prisma 6.19.3 from the live
database on 2026-08-24, with the exact changes in the following
`20260824000000_customer_accounts` migration removed: the `CUSTOMER`
`UserRole` value and `WishlistItem` table, indexes, and foreign keys. Together,
these two migrations recreate the current database on a new environment.

The baseline directory was added without changing the populated database or
Prisma's existing `_prisma_migrations` records. Mark the baseline as applied in
each existing environment before using `prisma migrate deploy`:

```powershell
npx dotenv -e .env.local -- prisma migrate resolve --applied 20260823000000_init_existing_supabase
```

`migrate resolve` changes only Prisma migration metadata; it does not execute
the baseline SQL or modify application tables or data.

## Verification

Run these read-only checks with the deployment environment values:

```powershell
npx dotenv -e .env.local -- prisma validate
npx dotenv -e .env.local -- prisma migrate status
npx dotenv -e .env.local -- cmd.exe /d /s /c 'npx prisma migrate diff --from-url="%DIRECT_URL%" --to-schema-datamodel prisma/schema.prisma --script'
```

The final command must report `-- This is an empty migration.` before making
any new migration.

## Future Changes

1. Change `prisma/schema.prisma`.
2. Create a timestamped migration with `prisma migrate dev --create-only` in a
   disposable development database, then review its SQL.
3. Deploy reviewed migrations with `prisma migrate deploy` using `DIRECT_URL`.
4. Never use `prisma db push`, `prisma migrate reset`, or a Supabase schema
   reset against an environment containing data.

New environments can be initialized with `prisma migrate deploy`; the baseline
creates the full current schema once.
