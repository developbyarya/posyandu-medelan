# Supabase Backend for Posyandu Medelan

This project relies on a serverless Postgres database hosted on Supabase to sync data from the offline-first clients.

## Setup Instructions

1. **Create a Supabase Project**: Go to [Supabase](https://supabase.com) and create a new project.
2. **Run Migrations**: Run the SQL in `supabase/migrations/0001_init.sql` in your Supabase SQL Editor.
3. **Environment Variables**: Copy your `Project URL` and `anon public` API key from Supabase (Project Settings > API) and add them to a `.env` file in the root of your React project:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security (Row Level Security - RLS)

Since this app is built for a single Padukuhan Posyandu without a login system (to keep it extremely simple for cadres), the tables are set to allow anonymous reads and writes (`anon` role). 
If you plan to scale this to multiple Posyandus, you should introduce Supabase Auth and restrict RLS policies to authenticated users only.
