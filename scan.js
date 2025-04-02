// scan.js

// Utility functions for cookie handling
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  console.log(`[scan.js] Set cookie: ${name}=${value} (expires in ${days} days)`);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop().split(';').shift();
    console.log(`[scan.js] Found cookie: ${name}=${cookieValue}`);
    return cookieValue;
  }
  console.log(`[scan.js] Cookie ${name} not found.`);
  return null;
}

// Main function to record a scan event
async function recordScan(qrCodeId, geotag, deviceInfo, ipAddress) {
  console.log("[scan.js] Starting scan recording process for QR code:", qrCodeId);
  const referralCookieName = 'referral_user';
  let qrCode = null;

  // Check if referral cookie exists; if not, retrieve QR code details and set the cookie
  if (!getCookie(referralCookieName)) {
    console.log("[scan.js] No referral cookie found. Fetching QR code details...");
    const { data, error } = await window.supabaseClient
      .from("qr_codes")
      .select("owner_id, active, redirect_url")
      .eq("id", qrCodeId)
      .single();
    if (error || !data) {
      console.error("[scan.js] Error fetching QR code details:", error);
      return;
    }
    qrCode = data;
    setCookie(referralCookieName, qrCode.owner_id, 30);
  } else {
    console.log("[scan.js] Referral cookie exists. Fetching QR code status...");
    const { data, error } = await window.supabaseClient
      .from("qr_codes")
      .select("active, redirect_url")
      .eq("id", qrCodeId)
      .single();
    if (error || !data) {
      console.error("[scan.js] Error fetching QR code status:", error);
      return;
    }
    qrCode = data;
  }

  // Insert the scan event into the scan_events table using the correct column names
  const { error: insertError } = await window.supabaseClient
    .from("scan_events")
    .insert([{ 
      qr_code_id: qrCodeId, 
      ip_address: ipAddress || null, 
      device_info: deviceInfo || null,
      location: geotag ? JSON.stringify(geotag) : null 
    }]);
  if (insertError) {
    console.error("[scan.js] Error inserting scan event:", insertError);
  } else {
    console.log("[scan.js] Scan event recorded successfully.");
  }

  // Determine the redirection URL based on QR code status
  let redirectUrl = 'https://uniqrn.co.uk'; // fallback URL
  if (qrCode.active) {
    redirectUrl = qrCode.redirect_url || 'https://yourdefaultdomain.com';
    console.log("[scan.js] QR code is active. Redirecting to:", redirectUrl);
  } else {
    console.log("[scan.js] QR code is inactive. Using fallback redirect:", redirectUrl);
  }
  return redirectUrl;
}

// Example event listener for a "Scan" button
document.getElementById('scanButton').addEventListener('click', async () => {
  console.log("[scan.js] Scan button clicked.");
  const qrCodeId = document.getElementById('qrCodeId').value;
  console.log("[scan.js] QR code ID entered:", qrCodeId);
  // For testing, using static geotag and device info; integrate actual geolocation if needed.
  const geotag = { lat: 51.5074, lng: -0.1278 };
  const deviceInfo = navigator.userAgent;
  const ipAddress = null; // Set if available
  const redirectUrl = await recordScan(qrCodeId, geotag, deviceInfo, ipAddress);
  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
});
