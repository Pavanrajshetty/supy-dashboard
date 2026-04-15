import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bqbhkqgukoprakytgldg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYmhrcWd1a29wcmFreXRnbGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTUxMTYsImV4cCI6MjA5MTczMTExNn0.6lTgjV7CpzxURwAb026iuZgaFKmjN6hsTvuej0DVQek";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
