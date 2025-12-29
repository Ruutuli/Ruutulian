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
   - **What it is**: A service that hosts (puts online) your website for free
   - **How to get it**: [Sign up here](https://railway.app) - also free!
   - **Why you need it**: Without this, your website only works on your computer

5. **GitHub Account** - This connects Railway to your project
   - **What it is**: A website where people store and share code projects
   - **How to get it**: [Sign up here](https://github.com) - free!
   - **Why you need it**: Railway needs to access your project from GitHub

---

## 🚀 Step-by-Step Setup Guide

Follow these steps in order. Take your time - there's no rush!

### Step 1: Download the Project Files

**What you're doing**: Getting all the website files onto your computer.

1. Open a program called "Command Prompt" (Windows) or "Terminal" (Mac)
   - **Windows**: Press the Windows key, type "cmd", and press Enter
   - **Mac**: Press Cmd+Space, type "terminal", and press Enter

2. Navigate to where you want to save the project (like your Desktop):
   ```bash
   cd Desktop
   ```

3. Download the project (replace `<your-repo-url>` with the actual link to this project):
   ```bash
   git clone <your-repo-url>
   ```

4. Move into the project folder:
   ```bash
   cd oc-wiki
   ```

**What you should see**: A new folder on your computer called "oc-wiki" with lots of files inside.

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

### Step 3: Set Up Your Site Information

**What you're doing**: Telling the website what to call itself and how to look.

1. In your project folder, find the file called `site-config.json.example`
2. Copy this file and name the copy `site-config.json` (remove the `.example` part)
   - **Windows**: Right-click, Copy, then Paste, then rename
   - **Mac**: Right-click, Duplicate, then rename

3. Open the `site-config.json` file in a text editor (like Notepad on Windows or TextEdit on Mac)

4. You'll see something like this:
   ```json
   {
     "websiteName": "My OC Wiki",
     "websiteDescription": "A place to store and organize information on original characters, worlds, lore, and timelines.",
     "iconUrl": "/icon.png",
     "siteUrl": "https://your-domain.com",
     "authorName": "Your Name",
     "shortName": "OC Wiki",
     "themeColor": "#8b5cf6",
     "backgroundColor": "#111827"
   }
   ```

5. Change the values to match your information:
   - `websiteName`: What you want your site to be called (e.g., "Sarah's Character Wiki")
   - `websiteDescription`: A short description of your site
   - `authorName`: Your name
   - `shortName`: A shorter version of your site name (for menus)
   - `themeColor`: A color code (like `#8b5cf6` for purple). You can find color codes at [htmlcolorcodes.com](https://htmlcolorcodes.com)
   - `backgroundColor`: Another color code for the background
   - `siteUrl`: Leave this for now - you'll fill it in later when you deploy
   - `iconUrl`: Leave this as is unless you have a custom icon

6. Save the file

**Don't worry**: You can change all of this later through the website's admin panel!

**Important**: Your `site-config.json` file is protected and won't be overwritten when you get updates (see the "Getting Updates" section below).

---

### Step 4: Set Up Supabase (Your Database)

**What you're doing**: Creating an online storage space for all your character data.

#### 4a. Create a Supabase Account and Project

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up (you can use your email or GitHub account)
3. Click "New Project"
4. Fill in:
   - **Name**: Give your project a name (like "My OC Wiki Database")
   - **Database Password**: Create a strong password (write this down somewhere safe!)
   - **Region**: Pick the one closest to where you live
5. Click "Create new project"
6. Wait 1-2 minutes while it sets up (you'll see a loading screen)

#### 4b. Get Your Connection Keys

**What these are**: Special codes that let your website talk to your database. Think of them like passwords.

1. In your Supabase dashboard, click on **Settings** (the gear icon on the left)
2. Click **API** in the settings menu
3. You'll see three important things:
   - **Project URL**: A long web address (starts with `https://`)
   - **anon public key**: A long string of letters and numbers
   - **service_role key**: Another long string (this one is secret - don't share it!)

4. **Write these down** or keep this page open - you'll need them in the next step!

#### 4c. Set Up Your Database Tables

**What you're doing**: Creating the "folders" where your data will be stored.

1. In your Supabase dashboard, click **SQL Editor** on the left sidebar
2. Click **New query**
3. You need to run **all** migration files in order. Here's the complete list:
   - `20250101000000_create_site_settings.sql`
   - `20250101000001_create_admin_credentials.sql`
   - `20250101000002_create_worlds.sql`
   - `20250101000003_create_oc_identities.sql`
   - `20250101000004_create_ocs.sql`
   - `20250101000005_create_story_aliases.sql`
   - `20250101000006_create_world_story_data.sql`
   - `20250101000007_create_world_races.sql`
   - `20250101000008_create_timelines.sql`
   - `20250101000009_create_timeline_events.sql`
   - `20250101000010_create_timeline_event_timelines.sql`
   - `20250101000011_create_timeline_event_characters.sql`
   - `20250101000012_create_world_lore.sql`
   - `20250101000013_create_world_lore_ocs.sql`
   - `20250101000014_create_world_lore_timeline_events.sql`
   - `20250101000015_create_dropdown_options.sql`
   - `20250101000016_create_current_projects.sql`
   - `20250101000017_add_story_alias_fk_to_ocs.sql`

4. For each migration file (in order):
   - Open the file from the `supabase/migrations/` folder on your computer (you can open it in Notepad/TextEdit)
   - Copy ALL the text from that file
   - Paste it into the SQL Editor in Supabase
   - Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for a green success message
   - Then move to the next file

**Important**: Run them in the exact order listed above! Each migration builds on the previous ones.

**If you see an error**: Make sure you copied the entire file, including all the text from top to bottom. Also verify you're running them in the correct order.

---

### Step 5: Set Up Your Environment Variables

**What you're doing**: Giving your website the secret codes it needs to connect to your database.

**What is an environment variable?**: It's like a secret note your website reads to know how to connect to things. We store these in a special file called `.env`.

1. In your project folder, find a file called `.env.example`
2. Copy this file and name the copy `.env` (remove the `.example` part)
   - **Windows**: Right-click, Copy, then Paste, then rename
   - **Mac**: Right-click, Duplicate, then rename

3. Open the `.env` file in a text editor

4. You'll see something like this:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   ```

5. Replace each value with the ones you copied from Supabase:
   - Replace `your_supabase_project_url_here` with your **Project URL** from Step 4b
   - Replace `your_supabase_anon_key_here` with your **anon public key** from Step 4b
   - Replace `your_supabase_service_role_key_here` with your **service_role key** from Step 4b

6. Save the file

**Important**: Never share your `.env` file with anyone! It contains secret keys.

---

### Step 6: Test It Locally (On Your Computer)

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

### Step 7: Complete the Initial Setup

**What you're doing**: Setting up your admin account so you can log in and add content.

1. In your browser, go to: `http://localhost:3000/admin/setup`

2. You'll see a setup form. Fill it out with:
   - Your site name and description
   - An admin username (this is what you'll use to log in)
   - An admin password (make it strong!)

3. Click "Complete Setup"

4. You'll be taken to a login page at `/admin/login`

5. Log in with the username and password you just created

**Congratulations!** Your website is now set up and running on your computer!

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

### Step 3: Add Your Secret Keys to Railway

**What you're doing**: Giving Railway the same secret codes you put in your `.env` file.

1. In your Railway project, click the **Variables** tab
2. Click **"New Variable"** for each of these:

   - **Variable name**: `NEXT_PUBLIC_SUPABASE_URL`
     **Value**: Your Supabase Project URL (from earlier)

   - **Variable name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     **Value**: Your Supabase anon key (from earlier)

   - **Variable name**: `SUPABASE_SERVICE_ROLE_KEY`
     **Value**: Your Supabase service_role key (from earlier)

   - **Variable name**: `NEXT_PUBLIC_SITE_URL`
     **Value**: Leave this blank for now - Railway will give you a URL later

   - **Variable name**: `NODE_ENV`
     **Value**: `production`

3. Save all the variables

### Step 4: Deploy Your Website

1. Railway will automatically start building your website
2. Wait for the build to finish (you'll see a progress bar)
3. Once it's done, Railway will give you a web address (like `your-site.railway.app`)
4. Copy that address and update the `NEXT_PUBLIC_SITE_URL` variable in Railway with the full address (include `https://`)

**Your website is now live!** Share the Railway URL with anyone you want to see it.

---

## 📥 Getting the Latest Updates

**What this section is for**: If the project has been updated and you want to get the newest version with bug fixes and new features.

**What you're doing**: Downloading the latest changes from GitHub to your computer.

### ✅ Your Settings Are Safe!

**Don't worry** - when you get updates, your personal settings will NOT be overwritten:
- ✅ Your `site-config.json` file (with your site name, colors, etc.) is protected
- ✅ Your `.env` file (with your database keys) is protected
- ✅ Your database and all your content stays the same
- ✅ Only code files will be updated

You can safely pull updates without losing any of your customizations!

### How to Get Updates

#### Step 1: Open Your Project Folder

1. Open Command Prompt (Windows) or Terminal (Mac)
2. Navigate to your project folder:
   ```bash
   cd path/to/oc-wiki
   ```
   (Replace `path/to/oc-wiki` with the actual path to your project folder)

#### Step 2: Download the Latest Updates

**What you're doing**: Getting all the new changes from GitHub.

1. Download the updates:
   ```bash
   git pull
   ```

**What you should see**: Messages showing files being downloaded and updated. This is normal!

**If you get an error**: Make sure you haven't made any changes to the code files. If you have, see the "If You've Made Changes" section below.

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

Don't worry - you don't need to understand code to use these! Here's what each file does in simple terms:

### `site-config.json`
**What it is**: A file that stores your site's basic information (name, colors, etc.)

**When to edit it**: When you want to change how your site looks or what it's called

**How to edit**: Open it in any text editor, change the values, save it

**Protected**: This file won't be overwritten when you get updates - your settings are safe!

### `.env` file
**What it is**: A file with secret connection codes (like passwords)

**When to edit it**: Only when setting up or if you change your Supabase project

**Important**: Never share this file or put it online!

**Protected**: This file won't be overwritten when you get updates - your database keys are safe!

### `supabase/migrations/` folder
**What it is**: Files that set up your database structure

**When to use it**: Only once, when first setting up (you already did this in Step 4c)

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

**What this means**: Your website can't talk to your database.

**How to fix**:
1. Check that your `.env` file has the correct Supabase URL and keys
2. Make sure you copied the entire keys (they're very long!)
3. Check that your Supabase project is still active (log into Supabase to check)

### Problem: Can't log in to admin

**What this means**: Your login isn't working.

**How to fix**:
1. Make sure you completed the setup at `/admin/setup` first
2. Try clearing your browser's cookies
3. Make sure you're using the correct username and password
4. If it's your first time, go to `/admin/setup` to create your account

### Problem: Website shows default/blank content

**What this means**: Your site settings aren't loading.

**How to fix**:
1. Make sure you ran the database setup files (Step 4c)
2. Check that your `site-config.json` file is saved correctly
3. Try refreshing the page (Ctrl+F5 or Cmd+Shift+R to hard refresh)

### Problem: Railway deployment fails

**What this means**: Railway couldn't build your website.

**How to fix**:
1. Check the Railway logs (click on your project, then "Logs")
2. Make sure all your environment variables are set in Railway
3. Make sure your Supabase keys are correct in Railway

### Problem: "Could not find the table 'public.world_races' in the schema cache"

**What this means**: The `world_races` table (or another database table) hasn't been created yet. This happens when migrations haven't been run or were run in the wrong order.

**How to fix**:
1. Go back to **Step 4c** in the setup guide (Set Up Your Database Tables)
2. Make sure you've run **all** migration files in the correct order
3. Specifically check that `20250101000007_create_world_races.sql` has been executed
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
