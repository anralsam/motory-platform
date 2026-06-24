// Shared Supabase connection config (safe to import from client, server, middleware).
// Public anon key + URL fall back to the live VOLD MOTOR project so the app runs out-of-the-box.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pycyttykvmbhykltnxzj.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3l0dHlrdm1iaHlrbHRueHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDk4MjgsImV4cCI6MjA5NDc4NTgyOH0.3qTumWEg9mYvjbxQpDWIhnBIGGkp8V7XJrjkfy_ZXag';
