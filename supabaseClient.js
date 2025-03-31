// ✅ Safe initialization when using <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

if (typeof supabase !== "undefined") {
    const supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    window.supabase = supabaseClient;
  } else {
    console.error("Supabase is not defined. Ensure you load @supabase/supabase-js before this script.");
  }
  