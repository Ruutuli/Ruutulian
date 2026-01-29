# OC Wiki - Your Personal Character Encyclopedia

**A simple website where you can store and organize information about your original characters (OCs), their worlds, stories, and timelines.**

Think of it like Wikipedia, but just for your own characters! You can customize everything - the name, colors, and how it looks. Best of all, you can access it from anywhere once it's set up online.

---

## 🎯 What Can This Do?

- **Customize Everything**: Change the site name, colors, and how it looks to match your style
- **Private Admin Area**: A password-protected section where only you can add or edit content
- **Public Wiki Pages**: Beautiful pages that anyone can view (if you want to share your characters)
- **Organize by Worlds**: Group your characters into different worlds or universes
- **Create Timelines**: Track when events happen in your stories
- **Add Lore**: Write detailed background information about your worlds
- **See Statistics**: View how many characters, worlds, and entries you have

---

## 📋 What You'll Need Before Starting

Don't worry if you don't know what these are - we'll explain each one and show you how to get them!

### Required Tools (All Free)

1. **Node.js** - This lets your computer run the website code
   - **What it is**: A program that runs JavaScript (the language websites use)
   - **How to get it**: [Download here](https://nodejs.org/) - choose the version that says "LTS" (Long Term Support)
   - **After installing**: You'll also get "npm" automatically (this is a tool that installs other tools)

2. **Git** - This lets you download the project files
   - **What it is**: A tool for downloading and managing code projects
   - **How to get it**: [Download here](https://git-scm.com/)
   - **Don't worry**: You don't need to learn how to use it - we'll just use it once to download the files

3. **Supabase Account** - This stores all your data (characters, worlds, etc.)
   - **What it is**: A free online database service (like a digital filing cabinet in the cloud)
   - **How to get it**: [Sign up here](https://supabase.com) - it's free!
   - **Why you need it**: Your website needs somewhere to store all the information you add

4. **Railway Account** - This puts your website online so others can see it
   - **What it is**: A hosting service that runs your website in the cloud. Railway offers a small free trial; after that, the **Hobby plan** is about **$5/month** for personal projects.
   - **How to get it**: [Sign up here](https://railway.app)
   - **Why you need it**: Without this, your website only works on your computer

5. **GitHub Account** - This connects Railway to your project
   - **What it is**: A website where people store and share code projects
   - **How to get it**: [Sign up here](https://github.com) - free!
   - **Why you need it**: Railway needs to access your project from GitHub

---

## 🚀 Step-by-Step Setup Guide

Follow these steps in order. Take your time - there's no rush!

### Step 1: Get the Project (Your Own Repo)

**What you're doing**: Getting the website files onto your computer from your own repository.

1. **Fork or clone the repo**
   - **Option A (recommended)**: On GitHub, click **Fork** to create your own copy, then clone your fork.
   - **Option B**: Clone the original repo directly (you won’t be able to push changes unless you have access).

2. Open Command Prompt (Windows) or Terminal (Mac):
   - **Windows**: Windows key → type "cmd" → Enter
   - **Mac**: Cmd+Space → type "terminal" → Enter

3. Go to where you want the project (e.g. Desktop):
   ```bash
   cd Desktop
   ```

4. Clone the repo (use **your fork’s URL** or the template repo URL):
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

5. Go into the project folder (use the folder name Git created; it’s usually the repo name):
   ```bash
   cd YOUR_REPO_NAME
   ```

**What you should see**: A folder with the project files (e.g. `package.json`, `src/`, `supabase/`).

---

### Step 2: Install Required Packages

**What you're doing**: Downloading all the extra code pieces your website needs to work.

1. Make sure you're in the project folder (you should be from Step 1)

2. Run this command:
   ```bash
   npm install
   ```

**What you should see**: Lots of text scrolling by. This is normal! It's downloading everything you need. Wait until you see your command prompt again (it might take 1-5 minutes).

**If you get an error**: Make sure you installed Node.js correctly. Try typing `node --version` - if it shows a version number, you're good!

---

### Step 3: Set Up Supabase (Your Database)

**What you're doing**: Creating an online storage space for all your character data.

#### 3a. Create a Supabase Account and Project

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up (you can use your email or GitHub account)
3. Click "New Project"
4. Fill in:
   - **Name**: Give your project a name (like "My OC Wiki Database")
   - **Database Password**: Create a strong password (write this down somewhere safe!)
   - **Region**: Pick the one closest to where you live
5. Click "Create new project"
6. Wait 1-2 minutes while it sets up (you'll see a loading screen)

#### 3b. Get Your Connection Keys

**What these are**: Codes that let your website talk to your database. Supabase offers two kinds of keys; the app supports both.

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API** (or **Project Settings** → **API**).
2. Note your **Project URL** (starts with `https://`).
3. Choose one of these:

   **Option A – New keys (recommended)**  
   In the **API Keys** tab:
   - **Publishable key** (`sb_publishable_...`) – for the browser and public pages. Use this for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Secret key** (`sb_secret_...`) – for server/admin only. Use this for `SUPABASE_SECRET_KEY`. Never expose it.

   **Option B – Legacy keys**  
   In the **Legacy API Keys** tab:
   - **anon public** – use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role** – use for `SUPABASE_SERVICE_ROLE_KEY`. Never expose it.

4. Keep this page open or copy the values; you’ll need them for the `.env` file.

#### 3c. Set Up Your Database Tables

**What you're doing**: Creating the database structure (tables, etc.) for your data.

1. In your Supabase dashboard, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Run **every** migration file from the `supabase/migrations/` folder **in order by filename** (oldest first). Full list (run in this order):
   - `20250101000000_create_core.sql`
   - `20250101000001_create_worlds.sql`
   - `20250101000002_create_oc_identities.sql`
   - `20250101000003_create_story_aliases.sql`
   - `20250101000004_create_ocs.sql`
   - `20250101000005_create_world_story_data.sql`
   - `20250101000006_create_world_races.sql`
   - `20250101000007_create_timelines.sql`
   - `20250101000008_create_timeline_events.sql`
   - `20250101000009_create_timeline_junction_tables.sql`
   - `20250101000010_create_world_lore.sql`
   - `20250101000011_create_dropdown_options.sql`
   - `20250101000012_create_current_projects.sql`
   - `20250101000013_create_oc_auxiliary_tables.sql`
   - `20250101000014_create_writing_prompts.sql`
   - `20250101000015_create_fanfics.sql`
   - `20250101000016_seed_tags_and_writing_prompts.sql`
   - `20250101000017_seed_dropdown_options.sql`
   - `20250101000018_seed_setting_options.sql`
   - `20250101000019_seed_trope_options.sql`
   - `20250101000020_drop_admin_credentials.sql`
4. For each file:
   - Open the file from `supabase/migrations/` on your computer (Notepad, TextEdit, or any editor).
   - Copy **all** the text.
   - Paste into the Supabase SQL Editor.
   - Click **Run** (or Ctrl+Enter / Cmd+Enter).
   - Wait for success, then do the next file.

**Important**: Run them in filename order. Each migration depends on earlier ones.

**If you see an error**: Check that you copied the whole file and that you’re running them in the correct order.

---

### Step 4: Set Up Your Environment Variables

**What you're doing**: Giving your website the keys and settings it needs (database, admin login, etc.).

Environment variables are stored in a file named `.env` in the project root (or in Railway **Variables** when deployed). Your app reads them at runtime.

1. In your project folder, copy `.env.example` to a new file named `.env` (remove the `.example` part).
2. Open `.env` in a text editor.
3. Fill in the required values:

   **Required (Supabase):**
   - `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase **Project URL** from Step 3b.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Your **Publishable key** (recommended) or **anon public** key from Step 3b.
   - `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` – Your **Secret key** (recommended) or **service_role** key from Step 3b. Use only one; the app checks both.

   **Required (admin login):**
   - `USERNAME` / `PASSWORD` – Admin login. **Set these in `.env` (or Railway variables when deployed).** Admin login uses only these env values; Supabase is not used for username or password. You must set them to log in and reach `/admin/setup` to complete site information.

   **Optional:**
   - `NEXT_PUBLIC_SITE_URL` – Full site URL (e.g. `https://your-app.railway.app`). Used for metadata and links; you can set it after deploy.
   - `NODE_ENV` – Use `development` locally; set to `production` on Railway.

4. Save the file.

**Important**: Never commit or share `.env`; it contains secrets.

---

### Step 5: Test It Locally (On Your Computer)

**What you're doing**: Making sure everything works before putting it online.

1. Make sure you're in the project folder in your command prompt/terminal

2. Run this command:
   ```bash
   npm run dev
   ```

3. Wait until you see a message like "Ready on http://localhost:3000"

4. Open your web browser and go to: `http://localhost:3000`

**What you should see**: Your website! It might look basic at first - that's okay.

---

### Step 6: Complete the Initial Setup

**What you're doing**: Saving your site information (name, description, etc.) so the wiki shows your branding. Admin username and password are **not** set here—they come only from `.env` or Railway variables (Step 4).

**Flow:** Set `USERNAME` and `PASSWORD` in `.env` (or Railway variables) → log in at `/admin/login` → go to `/admin/setup` to fill out site information. Supabase is only used to store **site settings** (name, description, icon, etc.); it has no effect on admin user/pass.

1. In your browser, go to: `http://localhost:3000/admin/login` and log in with the `USERNAME` and `PASSWORD` from your `.env`.
2. Then go to: `http://localhost:3000/admin/setup`

3. Fill out the setup form with **site information only** (no username/password fields):
   - **Website name**, **short name**, **description** – How your site is identified (you can change these later in **Admin → Site Settings**).
   - **Site URL**, **icon URL**, **author name** – Used for metadata and display.

4. Click **Complete Setup**.

**Congratulations!** Your site is set up. Site name, colors, and other settings can be changed anytime under **Admin → Site Settings**.

---

## 🚂 Putting Your Website Online (Deployment)

**What you're doing**: Making your website accessible to anyone on the internet (or just keeping it private - it's up to you).

### Step 1: Create a Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with your GitHub account (this connects Railway to your GitHub)
4. Verify your email if asked

### Step 2: Connect Your Project to Railway

1. In Railway, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. If asked, authorize Railway to access your GitHub
4. Find and select your OC Wiki repository
5. Railway will automatically detect that it's a Next.js project (this is good!)

### Step 3: Add Your Environment Variables to Railway

**What you're doing**: Giving Railway the same values you use in your local `.env` file.

1. In your Railway project, open the **Variables** tab.
2. Add these variables (same names and values as in your `.env` where applicable):

   **Required:**
   - `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Your **Publishable key** or **anon** key (the one you use for the public client).
   - `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` – Your **Secret key** or **service_role** key (server-only). Use one; the app supports both.

   **Required for admin login (same as local):**
   - `USERNAME` and `PASSWORD` – Admin login for the deployed site. Set these in Railway variables; admin login uses only these (Supabase is not used for credentials).

   **Optional but recommended:**
   - `NEXT_PUBLIC_SITE_URL` – Leave blank at first; after the first deploy, set it to your Railway URL (e.g. `https://your-app.railway.app`).
   - `NODE_ENV` – Set to `production`.

3. Save the variables.

### Step 4: Deploy Your Website

1. Railway will automatically start building your website
2. Wait for the build to finish (you'll see a progress bar)
3. Once it's done, Railway will give you a web address (like `your-site.railway.app`)
4. Copy that address and set the `NEXT_PUBLIC_SITE_URL` variable in Railway to the full URL (including `https://`).
5. Log in at `https://your-app.railway.app/admin/login` (use your actual Railway URL) with the `USERNAME` and `PASSWORD` you set in Railway variables. Then go to `/admin/setup` to complete site information if needed.

**Your site is now live.** Share the Railway URL with anyone you want.

### Step 5 (Optional): Add Your Own Domain

If you have a domain (e.g. `myocwiki.com`) and want to use it instead of the default `your-app.railway.app` URL:

1. In your Railway project, open your service (the deployed app), then go to **Settings**.
2. Under **Networking** or **Domains**, click **Add custom domain** (or **Generate domain** if you haven’t set one yet).
3. Enter your domain (e.g. `myocwiki.com` or `www.myocwiki.com`). Railway will show you the DNS records to add (usually a CNAME pointing to Railway, or an A record).
4. In your domain registrar (where you bought the domain), add the CNAME or A record Railway gives you. It can take a few minutes up to 48 hours to propagate.
5. Back in Railway, confirm the domain when it verifies. Railway will provision HTTPS for it.
6. In Railway **Variables**, set `NEXT_PUBLIC_SITE_URL` to your custom URL (e.g. `https://myocwiki.com` or `https://www.myocwiki.com`) so links and metadata use the correct address.

Your site will then be reachable at your own domain.

---

## 📥 Getting the Latest Updates

**What this section is for**: The project (or the repo you forked from) has been updated and you want the latest code with bug fixes and new features. If you have your own fork, see **“If you have your own fork”** below for how to pull updates from the original repo.

### ✅ Your Settings Are Safe!

**Don't worry** – when you get updates, your personal settings will NOT be overwritten:
- ✅ Your site name, colors, and settings live in the database and in the admin panel
- ✅ Your `.env` file (with your database keys) is protected
- ✅ Your database and all your content stay the same
- ✅ Only code files will be updated

You can safely pull updates without losing any of your customizations!

### If you have your own fork (getting updates from the original project)

When you **forked** the repo, your fork is a separate copy. Updates made to the **original** repo don’t appear in your fork until you pull them in. Do this when you want to get the latest changes from the original project into your fork.

**One-time setup – add the original repo as “upstream”:**

1. Open a terminal in your project folder.
2. Add the original repo as a remote named `upstream` (use the original project’s clone URL, not your fork’s):
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPO.git
   ```
   Replace `ORIGINAL_OWNER` and `ORIGINAL_REPO` with the original repo’s owner and repo name. You can copy the URL from the original project’s GitHub page (Code → HTTPS).

**Each time you want to pull in updates from the original project:**

1. In your project folder, make sure you’re on your main branch:
   ```bash
   git checkout main
   ```
   (Use `master` if that’s what your branch is called.)

2. Fetch the latest from the original repo:
   ```bash
   git fetch upstream
   ```

3. Merge those updates into your branch:
   ```bash
   git merge upstream/main
   ```
   (Use `upstream/master` if the original repo uses `master`.)

4. If you want your fork on GitHub to match your local copy, push:
   ```bash
   git push origin main
   ```

5. Then install any new packages and restart your dev server (see “How to Get Updates” below).

**If merge says there are conflicts:** Git will list the conflicting files. You have to edit those files to resolve the conflicts, then `git add` them and run `git commit`. If you’re unsure, you can back up your changes first (`git stash` before step 2, then `git stash pop` after and fix conflicts).

### How to Get Updates

#### Step 1: Open Your Project Folder

1. Open Command Prompt (Windows) or Terminal (Mac).
2. Go to your project folder (use the path where you cloned your repo):
   ```bash
   cd path/to/your-repo
   ```

#### Step 2: Get the Latest Code

- **If you have a fork** and want updates from the **original project**: use the steps in **“If you have your own fork”** above (fetch upstream, merge, then continue with Step 3 below).
- **If you’re only syncing your own repo** (e.g. you pushed from another machine, or you already merged from upstream): run:
   ```bash
   git pull
   ```

**What you should see**: Messages showing files being downloaded and updated. This is normal!

**If you get an error**: Make sure you haven’t made uncommitted changes to the code, or see the “If You’ve Made Changes” section below.

#### Step 3: Install Any New Packages

**What you're doing**: If the update added new features, you might need to install new code packages.

1. Install new packages:
   ```bash
   npm install
   ```

**When to do this**: Always run this after getting updates, just to be safe. It won't hurt if there are no new packages.

#### Step 4: Restart Your Development Server

**What you're doing**: Making sure your local website uses the new code.

1. If your development server is running, stop it (press **Ctrl+C** in the terminal where it's running)
2. Start it again:
   ```bash
   npm run dev
   ```

**You're done!** Your local version now has all the latest updates.

---

### If You've Made Changes to the Code

**Important**: If you've edited any code files, you have two options:

#### Option 1: Keep Your Changes (Recommended if you customized things)

1. Before pulling updates, save your changes temporarily:
   ```bash
   git stash
   ```

2. Get the updates:
   ```bash
   git pull
   ```

3. Get your changes back:
   ```bash
   git stash pop
   ```

**If there are conflicts**: Git will tell you. You may need to manually combine your changes with the updates. If this seems complicated, you might want to back up your custom files and start fresh with the update.

#### Option 2: Replace Everything with the Update

**Warning**: This will delete any changes you made to the code!

1. Reset to match the latest version:
   ```bash
   git fetch origin
   git reset --hard origin/main
   ```
   (Or `master` instead of `main` if that's what your branch is called)

2. Install packages:
   ```bash
   npm install
   ```

**Note**: Your `.env` file and database won't be affected - only code files will be replaced.

---

### If You Get Authentication Errors

**When this happens**: Git asks for a username and password when you try to pull.

**How to fix**: You'll need a GitHub Personal Access Token:

1. Go to [GitHub.com](https://github.com) and sign in
2. Click your profile picture → **Settings**
3. Scroll down and click **Developer settings**
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name (like "OC Wiki Updates")
7. Check the box for **repo** (this gives access to repositories)
8. Click **Generate token**
9. **Copy the token immediately** (you won't see it again!)
10. When Git asks for a password, paste the token instead of your password

**Easier Alternative**: Use [GitHub Desktop](https://desktop.github.com/) - it handles authentication automatically!

---

## ⚙️ Understanding the Configuration Files

You don't need to edit code to use these. Here's what matters:

### Site settings (name, colors, description)
**What it is**: Your site’s name, description, colors, and similar options.

**Where it lives**: In the database. You set it at **Admin → Site Settings** (or during initial setup at `/admin/setup`). There is no `site-config.json` file to edit.

### `.env` file
**What it is**: A file with secret connection codes (like passwords)

**When to edit it**: Only when setting up or if you change your Supabase project

**Important**: Never share this file or put it online!

**Protected**: This file won't be overwritten when you get updates - your database keys are safe!

### `supabase/migrations/` folder
**What it is**: Files that set up your database structure

**When to use it**: Only once, when first setting up (you already did this in Step 3c)

---

## 🔧 Using the Admin Panel

Once you're logged in, you can:

- **Site Settings** (`/admin/settings`): Change your site name, colors, and description
- **Add Worlds**: Create different universes for your characters
- **Add Characters**: Create character profiles with all their information
- **Create Timelines**: Track when events happen in your stories
- **Add Lore**: Write background information about your worlds
- **View Statistics**: See how many entries you have

Everything is done through easy-to-use forms - no coding required!

---

## 🐛 Troubleshooting (Fixing Problems)

### Problem: "Failed to connect to Supabase"

**What this means**: The app can’t reach your database.

**How to fix**:
1. Check that `.env` (or Railway variables) has the correct `NEXT_PUBLIC_SUPABASE_URL` and keys.
2. Use the **Publishable** (or anon) key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the **Secret** (or service_role) key for `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. Copy the full values (they’re long).
3. Confirm your Supabase project is active in the dashboard.

### Problem: Going to /admin/setup redirects to /admin/login

**What this means**: The setup page may require you to be logged in first (depending on your setup).

**How to fix**: Set `USERNAME` and `PASSWORD` in your `.env` file or Railway variables (see Step 4). Admin login uses only these—Supabase is not used for credentials. Then go to `/admin/login` and log in. After that, you can open `/admin/setup`.

### Problem: Can't log in to admin

**What this means**: Your login isn't working.

**How to fix**:
1. Admin login uses **only** `USERNAME` and `PASSWORD` from `.env` or Railway variables—Supabase is not used for credentials. Set them (or fix typos), restart the dev server if you changed `.env`, then use `/admin/login`.
2. Try clearing your browser's cookies
3. Make sure you're using the correct username and password (case-sensitive)

### Problem: Website shows default/blank content

**What this means**: Site settings aren’t loading (e.g. no site name).

**How to fix**:
1. Make sure you ran all database migrations (Step 3c).
2. Complete the initial setup at `/admin/setup` so site name and description are saved in the database.
3. Try a hard refresh (Ctrl+F5 or Cmd+Shift+R).

### Problem: Railway deployment fails

**What this means**: Railway couldn't build your website.

**How to fix**:
1. Check the Railway logs (click on your project, then "Logs")
2. Make sure all your environment variables are set in Railway
3. Make sure your Supabase keys are correct in Railway

### Problem: "Could not find the table 'public.world_races' in the schema cache"

**What this means**: The `world_races` table (or another database table) hasn't been created yet. This happens when migrations haven't been run or were run in the wrong order.

**How to fix**:
1. Go back to **Step 3c** in the setup guide (Set Up Your Database Tables)
2. Make sure you've run **all** migration files in the correct order
3. Specifically check that `20250101000006_create_world_races.sql` has been executed
4. If you're using Supabase CLI, you can run `supabase migration up` to apply any pending migrations
5. If you're using the Supabase dashboard SQL Editor, copy and run the migration file content there
6. Make sure all previous migrations (especially those that create `worlds` and `story_aliases` tables) have been run first, as `world_races` depends on them

### Still Having Problems?

- Check that you followed all the steps in order
- Make sure all your accounts (Supabase, Railway, GitHub) are set up
- Try starting over from Step 1 if something seems broken
- Check the error messages - they often tell you exactly what's wrong

---

## 📚 Helpful Resources

If you want to learn more about the tools used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about the website framework
- [Supabase Documentation](https://supabase.com/docs) - Learn about the database
- [Railway Documentation](https://docs.railway.app) - Learn about hosting

**But remember**: You don't need to read these to use your OC Wiki! Everything should work just by following the steps above.

---

## ✅ Quick Checklist

Before you start, make sure you have:
- [ ] Node.js installed
- [ ] Git installed
- [ ] A Supabase account
- [ ] A Railway account
- [ ] A GitHub account

After setup, you should have:
- [ ] Downloaded the project files
- [ ] Installed all packages (`npm install`)
- [ ] Created a Supabase project
- [ ] Set up your database tables
- [ ] Created your `.env` file with keys
- [ ] Tested the site locally
- [ ] Completed the admin setup
- [ ] Deployed to Railway (optional, but recommended)

---

## 🎉 You're Done!

Your OC Wiki is now set up and ready to use! Start adding your characters, worlds, and stories through the admin panel.

**Remember**: 
- Your website runs on your computer when you use `npm run dev`
- Your website is online when deployed to Railway
- You can update content anytime through the admin panel
- Everything is customizable - make it yours!

If you have questions, refer back to the relevant section above. Good luck with your OC Wiki!
