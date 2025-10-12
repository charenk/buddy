# Buddy Project - Git Workflow Instructions

## Step 1: Initialize and push the repo (once) ✅
```bash
git init
git remote add origin https://github.com/<you>/buddy.git
git checkout -b main
echo -e "node_modules\n.DS_Store\n.vercel\n.env\n.env.local\n.env.*.local" > .gitignore
git add .
git commit -m "chore: scaffold repo and docs"
git push -u origin main
```

## Step 2: Start a feature
```bash
git checkout -b feat/webhook
# make changes in Cursor...
git add -A
git commit -m "feat: initial webhook handler for @buddy comments"
git push -u origin feat/webhook
```

## Step 3: Open a PR
Do this on GitHub (web UI), merge when green.

## Step 4: Sync local after merge
```bash
git checkout main
git pull origin main
git branch -d feat/webhook # clean up local branch
git push origin --delete feat/webhook # optional: delete remote branch
```

## Step 5: Add Supabase Logging (Another Feature Cycle)

### Prerequisites for Step 5:
Before starting this step, you need to set up Supabase:

1. **Create Supabase Account & Project:**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project
   - Choose a region close to you
   - Wait for project setup (1-2 minutes)

2. **Get Your Project Credentials:**
   - Project URL (looks like `https://your-project-id.supabase.co`)
   - API Key (anon/public key)
   - Service Role Key (for server-side access)

3. **Create Environment File:**
   ```bash
   # Create .env file with:
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Install Supabase Client:**
   ```bash
   npm install @supabase/supabase-js
   ```

5. **Create Database Table:**
   - Go to your Supabase dashboard
   - Navigate to Table Editor
   - Create a new table called "events" for logging

### Git Workflow for Step 5:
```bash
git checkout -b feat/supabase-logs
# add lib/db.ts, envs, wiring...
git add -A
git commit -m "feat: add Supabase events table and server logging"
git push -u origin feat/supabase-logs
# open PR → merge → pull main
```

## Step 6: Tag a 'demo ready' release (optional)
```bash
git tag -a v0.1.0 -m "MVP demo with webhook + logging"
git push --tags
```

---

## Alternative: Skip Supabase for Learning
If you want to focus on learning Git workflow first, you can:
- Mock the Supabase integration (create files without actual connection)
- Or complete steps 2-4 with simple code changes
- Set up Supabase later when ready
