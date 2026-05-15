# Google Login + Private Data Setup

The app uses Supabase Auth with Google OAuth. The frontend is already wired to:

- redirect users through Google login;
- load only rows where `user_id` matches the authenticated user;
- upload photos to private Storage paths under `<auth.uid()>/...`;
- render private photos through one-hour signed URLs;
- show the signed-in Google avatar/email and a sign-out action in Settings.

## Google Cloud OAuth client

In **Google Cloud Console → APIs & Services → Credentials**, open the same **OAuth 2.0 Client ID** whose Client ID and Client Secret you pasted into Supabase.

Add this exact value under **Authorized redirect URIs**:

```text
https://fbqjgifqlbjxwtamwzud.supabase.co/auth/v1/callback
```

Important details:

- Add it to **Authorized redirect URIs**, not just **Authorized JavaScript origins**.
- Use the exact URL above with no trailing slash.
- If you have multiple Google OAuth clients, make sure Supabase is using the Client ID from the one that contains this redirect URI.
- If Google shows `redirect_uri=https://fbqjgifqlbjxwtamwzud.supabase.co/auth/v1/callback`, that means this exact URI is still missing from the active Google OAuth client.

## Supabase dashboard

1. Go to **Authentication → Providers → Google**.
2. Toggle Google **on**, paste the Google Client ID and Client Secret from the Google OAuth client above, then click **Save**. If this is skipped, Supabase returns `Unsupported provider: provider is not enabled` when the app tries to sign in.
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


## Troubleshooting

### Google says the app does not comply with OAuth 2.0 policy

If Google shows this request detail:

```text
redirect_uri=https://fbqjgifqlbjxwtamwzud.supabase.co/auth/v1/callback
```

fix it in **Google Cloud Console**, not in the React app:

1. Open **APIs & Services → Credentials**.
2. Open the OAuth 2.0 Client ID used by Supabase.
3. Add `https://fbqjgifqlbjxwtamwzud.supabase.co/auth/v1/callback` to **Authorized redirect URIs**.
4. Save the Google OAuth client.
5. Retry sign-in in a fresh browser tab.

The app's own redirect target is still your site origin (`http://localhost:5173` locally or `https://zommy.vercel.app` in production); Google first redirects through Supabase's callback URL so Supabase can complete the OAuth exchange.

### The app says “Something went wrong” after login and REST requests return 400

If the browser console shows requests like these returning `400`:

```text
/rest/v1/profiles?select=*&user_id=eq.<user-id>
/rest/v1/entries?select=*&user_id=eq.<user-id>
```

then the private-data migration has not been applied yet, or Supabase's schema cache has not picked it up. Run `supabase/migrations/20260515000000_private_google_auth.sql` in the Supabase SQL editor, confirm the `profiles.user_id`, `entries.user_id`, and `entries.photo_path` columns exist, then refresh the app.

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
