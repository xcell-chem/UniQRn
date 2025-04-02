function initSupabaseClient() {
    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      console.error("Supabase CDN not loaded or invalid.");
      return null;
    }
    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    console.log("[supabaseClient.js] Supabase client initialized.");
    return client;
  }
  
  window.supabaseClient = initSupabaseClient();
  window.reinitSupabaseClient = () => {
    window.supabaseClient = initSupabaseClient();
    console.log("[supabaseClient.js] Supabase client reinitialized.");
  };