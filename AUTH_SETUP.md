# Google Login + Private Data Setup

The app uses Supabase Auth with Google OAuth. The frontend is already wired to:

- redirect users through Google login;
- load only rows where `user_id` matches the authenticated user;
- upload photos to private Storage paths under `<auth.uid()>/...`;
- render private photos through one-hour signed URLs;
- show the signed-in Google avatar/email and a sign-out action in Settings.

## Supabase dashboard

1. Go to **Authentication → Providers → Google**.
2. Enable Google and save the Google Client ID and Client Secret.
3. Go to **Authentication → URL Configuration**.
4. Set the production Site URL to:

   ```text
   https://zommy.vercel.app/
   ```

5. Add redirect URLs for local development and production:

   ```text
   http://localhost:5173
   http://localhost:5173/*
   https://zommy.vercel.app
   https://zommy.vercel.app/*
   ```

## Database and Storage migration

Run this SQL file in the Supabase SQL editor:

```text
supabase/migrations/20260515000000_private_google_auth.sql
```

This migration intentionally wipes existing `profiles` and `entries` rows because the selected migration option was **wipe and start clean**.

## Vercel environment variables

Set these in Vercel for the production deployment:

```text
VITE_SUPABASE_URL=https://fbqjgifqlbjxwtamwzud.supabase.co
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

The local app still has the current project values as fallbacks, but Vercel should use explicit environment variables.
