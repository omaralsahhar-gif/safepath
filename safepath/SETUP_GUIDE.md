# SafePath — Setup Guide
## Get your app live in about 30 minutes, no coding required.

---

## STEP 1 — Create a GitHub account & upload the code

GitHub is where your code is stored. Vercel (your host) reads from it.

1. Go to **github.com** → click **Sign up** → create a free account
2. Once logged in, click the **+** button (top right) → **New repository**
3. Name it `safepath` → leave everything else default → click **Create repository**
4. On the next screen, click **uploading an existing file**
5. Upload ALL the files from this project folder (drag the whole folder in)
6. Click **Commit changes**

---

## STEP 2 — Create your Supabase database

Supabase is your real database — it stores all bookings, students, progress records, and payments.

1. Go to **supabase.com** → click **Start your project** → sign up free
2. Click **New project**
   - Name: `safepath`
   - Database password: choose something strong, **save it somewhere**
   - Region: **Australia (Sydney)**
   - Click **Create new project** (takes ~2 minutes to spin up)

3. Once ready, go to the **SQL Editor** tab (left sidebar)
4. Click **New query**
5. Open the file `supabase_setup.sql` from this project, copy the entire contents, paste it in, click **Run**
   - You should see "Success. No rows returned" — that means it worked.

---

## STEP 3 — Create your three demo users

1. In Supabase, go to **Authentication** → **Users** → **Invite user**
2. Create these three accounts one at a time:
   - `manager@safepath.com.au`
   - `instructor@safepath.com.au`
   - `student@safepath.com.au`
   - (They'll get invite emails — or you can set passwords manually under the user settings)

3. Go to **SQL Editor** → **New query** and run:
```sql
UPDATE public.profiles 
SET role = 'manager', full_name = 'Sarah Bell' 
WHERE email = 'manager@safepath.com.au';

UPDATE public.profiles 
SET role = 'instructor', full_name = 'James Chen', 
    qualification = 'Certificate IV in Driving Instruction'
WHERE email = 'instructor@safepath.com.au';

UPDATE public.profiles 
SET role = 'student', full_name = 'Alex Johnson'
WHERE email = 'student@safepath.com.au';
```

4. To set passwords: go to **Authentication → Users**, click each user → **Send password recovery** or set it manually by clicking the three-dot menu → **Reset password**. Use `SafePath2026!` for the demo.

---

## STEP 4 — Get your Supabase keys

1. In Supabase, go to **Project Settings** (gear icon, bottom left) → **API**
2. You need two values — copy them somewhere:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

---

## STEP 5 — Deploy to Vercel

Vercel hosts your app online for free.

1. Go to **vercel.com** → **Sign up** → choose **Continue with GitHub**
2. Click **Add New Project** → select your `safepath` repository → click **Import**
3. Before clicking Deploy, click **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | your Project URL from Step 4 |
   | `REACT_APP_SUPABASE_ANON_KEY` | your anon public key from Step 4 |

4. Click **Deploy** — wait about 90 seconds
5. Vercel gives you a live URL like `safepath.vercel.app` — that's your app!

---

## STEP 6 — Add a sample booking (so the dashboard isn't empty)

In Supabase SQL Editor, run:

```sql
-- First get your user IDs
SELECT id, full_name, role FROM public.profiles;

-- Then create a booking (replace the UUIDs with real ones from above)
INSERT INTO public.bookings (student_id, instructor_id, lesson_datetime, duration_minutes, location, status)
VALUES (
  'PASTE_STUDENT_UUID_HERE',
  'PASTE_INSTRUCTOR_UUID_HERE',
  now() + interval '2 days',
  60,
  '12 Park Road, Parramatta NSW',
  'confirmed'
);
```

---

## YOUR APP IS NOW LIVE ✓

Log in at your Vercel URL with:
- **manager@safepath.com.au** / SafePath2026! → sees everything
- **instructor@safepath.com.au** / SafePath2026! → sees schedule & students  
- **student@safepath.com.au** / SafePath2026! → sees own lessons & progress

---

## Selling this to a real driving school

When a driving school wants to use it:

1. **Create a new Supabase project** just for them (free tier = 1 project, so each client needs their own)
2. Run `supabase_setup.sql` in their project
3. Deploy a new Vercel project pointing to their Supabase keys
4. Create their real instructor and student accounts
5. Charge them a monthly fee (suggested: $49–$99/month per school)

### What to charge for:
- Initial setup fee: $200–$500
- Monthly subscription: $49–$99/month
- Custom branding (their logo/colours): $150 one-time

---

## Making future changes to the app

When you want to update the app:
1. Edit the files on your computer
2. Upload changed files to GitHub (same way as Step 1)
3. Vercel automatically re-deploys within 60 seconds — all clients get the update instantly

---

## Need help?

If anything goes wrong:
- Supabase errors → check the **Logs** tab in Supabase
- App not loading → check **Vercel → your project → Deployments → Functions** for error messages
- Database issues → go to **Supabase → Table Editor** to view your data directly
