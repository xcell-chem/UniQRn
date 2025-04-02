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

// Main function to record a scan event or handle registration flow
async function recordScan(qrCodeId, geotag, deviceInfo, ipAddress) {
  console.log("[scan.js] Starting scan recording process for QR code:", qrCodeId);
  const referralCookieName = 'referral_user';
  
  // First, get QR code details including 'registered'
  const { data: qrData, error: qrError } = await window.supabaseClient
    .from("qr_codes")
    .select("owner_id, active, redirect_url, registered")
    .eq("id", qrCodeId)
    .single();
    
  if (qrError || !qrData) {
    console.error("[scan.js] Error fetching QR code details:", qrError);
    return;
  }
  
  const qrCode = qrData;
  console.log("[scan.js] Retrieved QR code details:", qrCode);
  
  // If the QR code is NOT registered, force login/registration:
  if (!qrCode.registered) {
    console.log("[scan.js] QR code is not registered. Prompting user to log in and claim the QR code.");
    // Hide the loading indicator, show the login and registration form
    document.getElementById("loading").style.display = "none";
    document.getElementById("login").style.display = "block";
    document.getElementById("form").style.display = "block";
    // Optionally, pre-fill the QR code ID in a hidden field or store it for later use
    return; // stop further processing (no scan event is logged)
  }
  
  // If the QR code is registered, then ensure the referral cookie is set:
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
  
  // Determine redirection URL based on QR code status (active or fallback)
  let redirectUrl = 'https://uniqrn.co.uk'; // fallback URL
  if (qrCode.active) {
    redirectUrl = qrCode.redirect_url || 'https://yourdefaultdomain.com';
    console.log("[scan.js] QR code is active. Redirecting to:", redirectUrl);
  } else {
    console.log("[scan.js] QR code is inactive. Using fallback redirect:", redirectUrl);
  }
  
  return redirectUrl;
}

// Event listener for the "Scan" button
document.getElementById('scanButton').addEventListener('click', async () => {
  console.log("[scan.js] Scan button clicked.");
  const qrCodeId = document.getElementById('qrCodeId').value;
  console.log("[scan.js] QR code ID entered:", qrCodeId);
  // Show a loading indicator while processing
  document.getElementById("loading").style.display = "block";
  // Hide login and form sections initially
  document.getElementById("login").style.display = "none";
  document.getElementById("form").style.display = "none";
  
  // For testing, using static geotag and device info; integrate actual geolocation if needed.
  const geotag = { lat: 51.5074, lng: -0.1278 };
  const deviceInfo = navigator.userAgent;
  const ipAddress = null; // Set if available
  
  const redirectUrl = await recordScan(qrCodeId, geotag, deviceInfo, ipAddress);
  
  // Hide the loading indicator
  document.getElementById("loading").style.display = "none";
  
  // If a redirect URL was returned, proceed with redirection
  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
});
