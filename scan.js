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

// Function to extract a URL parameter by name
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Main function to process a QR code
// If the QR code is not registered, it shows the login/registration UI.
// If it is registered, it logs a scan event (and sets a referral cookie) before redirecting.
async function processQRCode(qrCodeId, geotag, deviceInfo, ipAddress) {
  console.log("[scan.js] Processing QR code:", qrCodeId);
  
  // Show loading indicator
  document.getElementById("loading").style.display = "block";
  
  // Retrieve QR code details (including registration status)
  const { data: qrData, error: qrError } = await window.supabaseClient
    .from("qr_codes")
    .select("owner_id, active, redirect_url, registered")
    .eq("id", qrCodeId)
    .single();
    
  // Hide loading indicator
  document.getElementById("loading").style.display = "none";
  
  if (qrError || !qrData) {
    console.error("[scan.js] Error fetching QR code details:", qrError);
    alert("Error fetching QR code details.");
    return;
  }
  
  const qrCode = qrData;
console.log("[DEBUG] QR Registered:", qrCode.registered);
console.log("[DEBUG] QR Owner ID:", qrCode.owner_id);
  console.log("[scan.js] Retrieved QR code details:", qrCode);
  
  // If the QR code is not registered, prompt login/registration.
  if (!qrCode.registered || !qrCode.owner_id) {
    console.log("[scan.js] QR code is not registered. Prompting for login/registration.");
    // Show the login and registration form.
    document.getElementById("login").style.display = "block";
    document.getElementById("form").style.display = "block";
    // Store the QR code ID in the hidden input for later use in the registration process.
    document.getElementById("qrCodeId").value = qrCodeId;
    return; // Stop processing further.
  }
  
  // If the QR code is registered, set the referral cookie if it doesn't exist.
  const referralCookieName = 'referral_user';
  if (!getCookie(referralCookieName)) {
    setCookie(referralCookieName, qrCode.owner_id, 30);
  } else {
    console.log("[scan.js] Referral cookie already exists.");
  }
  
  // Insert the scan event into the scan_events table.
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
  
  // Determine the redirection URL based on QR code status.
  let redirectUrl = 'https://uniqrn.co.uk'; // fallback URL
  if (qrCode.active) {
    redirectUrl = qrCode.redirect_url || 'https://yourdefaultdomain.com';
    console.log("[scan.js] QR code is active. Redirecting to:", redirectUrl);
  } else {
    console.log("[scan.js] QR code is inactive. Using fallback redirect:", redirectUrl);
  }
  
  // Redirect the user.
  window.location.href = redirectUrl;
}

// Automatically process the QR code when the page loads (if provided via URL)
window.addEventListener("DOMContentLoaded", async () => {
  const qrCodeIdFromUrl = getQueryParam("id"); // expecting URL like .../scan?id=<QR_CODE_ID>
  if (qrCodeIdFromUrl) {
    console.log("[scan.js] Retrieved QR code ID from URL:", qrCodeIdFromUrl);
    // Optionally, store it in the hidden input
    document.getElementById("qrCodeId").value = qrCodeIdFromUrl;
    // For this example, we use static geotag & device info; replace with actual geolocation if needed.
    const geotag = { lat: 51.5074, lng: -0.1278 };
    const deviceInfo = navigator.userAgent;
    const ipAddress = null;
    await processQRCode(qrCodeIdFromUrl, geotag, deviceInfo, ipAddress);
  } else {
    console.log("[scan.js] No QR code ID provided in URL.");
  }
});
