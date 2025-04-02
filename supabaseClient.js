if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
    console.error("Supabase CDN not loaded or invalid.");
} else {
    // Create a separate client variable so we don't overwrite the global 'supabase' object.
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
}
