function login() {
  const currentPath = window.location.pathname + window.location.search;
  const redirectUrl = window.location.origin + '/auth.html?next=' + encodeURIComponent(currentPath);

  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
}
