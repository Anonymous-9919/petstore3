# Starter Config — Copy-Paste Boilerplate

Copy the relevant files from each folder into your new project root:

## Quick Setup

```bash
# 1. Copy all config files to your new project
copy "_starter-config\nodejs\package.json" ".\"
copy "_starter-config\env\.env.example" ".\"
copy "_starter-config\github\.gitignore" ".\"
copy "_starter-config\vercel\vercel.json" ".\"
copy "_starter-config\vercel\.vercelignore" ".\"

# 2. Copy Supabase files
copy "_starter-config\supabase\migration.sql" ".\"
copy "_starter-config\supabase\storage.sql" ".\"

# 3. Copy lib folder (create lib\ first)
mkdir lib
copy "_starter-config\supabase\supabase-client.js" "lib\supabase.js"

# 4. Install dependencies
npm install
```

## What Each File Does

| Folder | File | Purpose |
|--------|------|---------|
| `nodejs/` | `package.json` | Node.js deps (Express, Supabase, Google GenAI, Busboy, Vercel CLI) |
| `env/` | `.env.example` | Template for Supabase URL + keys, rename to `.env.local` |
| `github/` | `.gitignore` | Ignores `node_modules/`, `.vercel/`, `.env*`, `*.local` |
| `vercel/` | `vercel.json` | Static + serverless function routing config |
| `vercel/` | `.vercelignore` | Excludes `node_modules`, `.git`, `.env*` from deploy |
| `supabase/` | `migration.sql` | Full DB schema: profiles, websites, pages, assets, contacts, etc. |
| `supabase/` | `storage.sql` | Supabase Storage setup (placeholder) |
| `supabase/` | `supabase-client.js` | Exports `supabase` (anon) + `supabaseAdmin` (service role) clients |

## After Copying

1. **Rename `.env.example` → `.env.local`** and fill in your Supabase credentials
2. **Run `migration.sql`** in Supabase SQL Editor
3. **Deploy** via `npx vercel --prod`
