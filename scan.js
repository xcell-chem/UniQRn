const qrId = new URLSearchParams(window.location.search).get("id");

const loginBox = document.getElementById("login");
const formBox = document.getElementById("form");
const loading = document.getElementById("loading");
const thankyou = document.getElementById("thankyou");

let user = null;

async function checkQRCode() {
  if (loading) loading.style.display = "block";

  const { data: qrData } = await window.supabase
    .from("qr_codes")
    .select("*")
    .eq("id", qrId)
    .limit(1);

  const qr = qrData?.[0];

  const { data: sessionData } = await window.supabase.auth.getSession();
  user = sessionData?.session?.user;

  if (qr?.owner_id && qr?.redirect_url) {
    if (user?.id) {
      await window.supabase.from("scan_events").insert({ qr_id: qrId, user_id: user.id });
    }

    let redirectTo = qr.redirect_url;
    if (!redirectTo.startsWith("http")) redirectTo = "https://" + redirectTo;
    window.location.href = redirectTo;
    return;
  }

  if (!user) {
    const { data: userData, error } = await window.supabase.auth.getUser();
    if (error?.message === "User from sub claim in JWT does not exist") {
      await window.supabase.auth.signOut();
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
  const next = window.location.pathname + window.location.search;
  const redirectUrl = `${window.location.origin}/auth.html?next=${encodeURIComponent(next)}`;

  console.log("Redirecting to:", redirectUrl); // ✅ Add this for debug

  await window.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl // ✅ Explicit assignment required
    }
  });
}

async function claimQRCode() {
  const location = document.getElementById("location").value.trim();
  let redirect = document.getElementById("redirect_url").value.trim();
  const label = document.getElementById("label").value.trim();
  const custom_1 = document.getElementById("custom_1").value.trim();
  const active = document.getElementById("active").checked;
  const single_use = document.getElementById("single_use").checked;

  if (!redirect.startsWith("http")) redirect = "https://" + redirect;
  if (!location || !redirect || !user?.id) {
    alert("Please log in and fill all fields.");
    return;
  }

  const { data: checkQR } = await window.supabase
    .from("qr_codes")
    .select("id")
    .eq("id", qrId)
    .limit(1);

  if (checkQR?.length > 0) {
    alert("QR code already claimed.");
    return;
  }

  const { error: qrInsertError } = await window.supabase.from("qr_codes").insert({
    id: qrId,
    owner_id: user.id,
    shared_location: location,
    redirect_url: redirect,
    registered: true,
    label,
    custom_1,
    active,
    single_use
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
  await window.supabase.auth.signOut();
  window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => checkQRCode());