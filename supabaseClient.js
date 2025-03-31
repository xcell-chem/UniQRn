// Only run once Supabase is loaded and properly exposed
if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
    console.error("Supabase CDN not loaded or invalid.");
  } else {
    window.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  }
  