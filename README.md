# Maktab — Teacher Workspace

A private workspace for session planning, study plans, weekly progress reports,
and progress visualization, built for Qur'an/Tajweed/Arabic teaching.

## 1. Set up Supabase (your database)

1. Create a free project at supabase.com.
2. Open **SQL Editor** in the Supabase dashboard, paste the contents of
   `supabase-schema.sql`, and run it. This creates the `maktab_data` table
   and locks every row to the signed-in user with Row Level Security.
3. Open **Project Settings > API** and copy the **Project URL** and
   **anon public key**.
4. In **Authentication > Providers**, make sure **Email** is enabled
   (it is by default). Under **Authentication > URL Configuration**, add
   your local dev URL (`http://localhost:5173`) and your future Vercel URL
   to the allowed redirect URLs once you have it.

## 2. Run locally

```
cp .env.example .env
# paste your Project URL and anon key into .env
npm install
npm run dev
```

Open the local URL, enter your email, and click the sign-in link that
arrives in your inbox.

## 3. Deploy to Vercel

Push this project to GitHub, then import it at vercel.com. Add the same two
environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the
Vercel project's **Settings > Environment Variables**, then deploy. Add the
resulting `*.vercel.app` URL to Supabase's allowed redirect URLs so sign-in
links work in production too.

## Notes

- Sign-in is a passwordless "magic link" sent to your email — no passwords
  to manage.
- Data (students, study plans, weekly reports, pricing) is stored in
  Supabase and synced to whichever device you're signed in on.
- The free Supabase tier is more than enough for one teacher's roster.
