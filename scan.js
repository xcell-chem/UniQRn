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

// Main function to handle scanning and registration flow
async function processQRCode(qrCodeId, geotag, deviceInfo, ipAddress) {
  console.log("[scan.js] Processing QR code:", qrCodeId);
  
  // Show loading indicator
  document.getElementById("loading").style.display = "block";
  
  // Retrieve QR code details including registration status
  const { data: qrData, error: qrError } = await window.supabaseClient
    .from("qr_codes")
    .select("owner_id, active, redirect_url, registered")
    .eq("id", qrCodeId)
    .single();
    
  document.getElementById("loading").style.display = "none";
  
  if (qrError || !qrData) {
    console.error("[scan.js] Error fetching QR code details:", qrError);
    alert("Error fetching QR code details.");
    return;
  }
  
  const qrCode = qrData;
  console.log("[scan.js] Retrieved QR code details:", qrCode);
  
  // If the QR code is not registered, prompt login/registration
  if (!qrCode.registered) {
    console.log("[scan.js] QR code is not registered. Prompting for login/registration.");
    // Display login and registration form
    document.getElementById("login").style.display = "block";
    document.getElementById("form").style.display = "block";
    // Optionally, store the QR code ID for later use
    document.getElementById("qrCodeId").value = qrCodeId;
    return;
  }
  
  // If the QR code is registered, ensure referral cookie is set
  const referralCookieName = 'referral_user';
  if (!getCookie(referralCookieName)) {
    setCookie(referralCookieName, qrCode.owner_id, 30);
  } else {
    console.log("[scan.js] Referral cookie already exists.");
  }
  
  // Insert the scan event into the scan_events table
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
  
  // Determine redirection URL
  let redirectUrl = 'https://uniqrn.co.uk'; // fallback URL
  if (qrCode.active) {
    redirectUrl = qrCode.redirect_url || 'https://yourdefaultdomain.com';
    console.log("[scan.js] QR code is active. Redirecting to:", redirectUrl);
  } else {
    console.log("[scan.js] QR code is inactive. Using fallback redirect:", redirectUrl);
  }
  
  // Redirect the user
  window.location.href = redirectUrl;
}

// Automatically process the QR code if the QR code ID is provided
window.addEventListener("DOMContentLoaded", async () => {
  // Here you could extract the QR code ID from the URL or from another source.
  // For this example, we assume it's provided in the hidden input field.
  const qrCodeId = document.getElementById("qrCodeId").value;
  if (qrCodeId) {
    // Optionally, you could auto-trigger the scan processing
    // For example, call processQRCode() automatically:
    const geotag = { lat: 51.5074, lng: -0.1278 };
    const deviceInfo = navigator.userAgent;
    const ipAddress = null;
    await processQRCode(qrCodeId, geotag, deviceInfo, ipAddress);
  } else {
    console.log("[scan.js] No QR code ID provided for processing.");
  }
});
