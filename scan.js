const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  const qrId = new URLSearchParams(window.location.search).get("id");

  const loginBox = document.getElementById("login");
  const formBox = document.getElementById("form");
  const loading = document.getElementById("loading");
  const thankyou = document.getElementById("thankyou");

  let user = null;

  async function checkQRCode() {
    loading.style.display = "block";

    const { data: qrData } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("id", qrId)
      .limit(1);

    const qr = qrData?.[0];

    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData?.session?.user;

    if (qr?.owner_id && qr?.redirect_url) {
      if (user?.id) {
        await supabase.from("scan_events").insert({ qr_id: qrId, user_id: user.id });
      }

      let redirectTo = qr.redirect_url;
      if (!redirectTo.startsWith("http")) redirectTo = "https://" + redirectTo;
      window.location.href = redirectTo;
      return;
    }

    if (!user) {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error?.message === "User from sub claim in JWT does not exist") {
        await supabase.auth.signOut();
        location.reload();
        return;
      }
      user = userData?.user;
    }

    loading.style.display = "none";

    if (!user?.id) {
      loginBox.style.display = "block";
    } else {
      document.getElementById("logout-box").style.display = "block";
      formBox.style.display = "block";
    }
  }

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href }
    });
  }

  async function claimQRCode() {
    const location = document.getElementById("location").value.trim();
    let redirect = document.getElementById("redirect_url").value.trim();

    if (!redirect.startsWith("http")) redirect = "https://" + redirect;
    if (!location || !redirect || !user?.id) {
      alert("Please log in and fill all fields.");
      return;
    }

    const referred_by = document.cookie
      .split("; ")
      .find(row => row.startsWith("referred_by_id="))
      ?.split("=")[1];

    await supabase.from("app_users").insert({
      id: user.id,
      email: user.email,
      parent_id: referred_by || null,
      coin_balance: 250
    }, { onConflict: "id", ignoreDuplicates: true });

    if (referred_by) {
      await supabase.rpc("add_referral_rewards", { new_user_id: user.id });
    }

    const { data: checkQR } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("id", qrId)
      .limit(1);

    if (checkQR?.length > 0) {
      alert("QR code already claimed.");
      return;
    }

    const { error: qrInsertError } = await supabase.from("qr_codes").insert({
      id: qrId,
      owner_id: user.id,
      shared_location: location,
      redirect_url: redirect,
      registered: true
    });

    if (qrInsertError) {
      console.error("QR insert failed:", qrInsertError);
      alert("Unable to register QR code.");
      return;
    }

    formBox.style.display = "none";
    thankyou.style.display = "block";
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  checkQRCode();