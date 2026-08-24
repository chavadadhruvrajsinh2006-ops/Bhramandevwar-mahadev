// Admin session guard: never keep the admin panel accessible after logout/navigation.
(async function () {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client || !client.auth) return;
    const { data } = await client.auth.getSession();
    if (!data || !data.session) {
      window.location.replace('index.html');
      return;
    }
    client.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT' || !session) window.location.replace('index.html');
    });
  } catch (e) {
    // If auth cannot be checked, do not expose admin UI.
    window.location.replace('index.html');
  }
})();
