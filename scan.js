// scan.js

// Utility to set a cookie
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  console.log(`[scan.js] Cookie set: ${name}=${value} (expires in ${days} days)`);
}

// Utility to get a cookie
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

async function recordScan(qrCodeId, geotag, deviceInfo) {
  console.log('[scan.js] Starting scan record process.');
  const referralCookieName = 'referral_user';
  let qrCode = null;
  
  // If no referral cookie exists, retrieve QR code details and set it
  if (!getCookie(referralCookieName)) {
    console.log('[scan.js] No referral cookie found. Fetching QR code details...');
    let { data, error } = await supabase
      .from('qr_codes')
      .select('owner_id, active, redirect_url')
      .eq('id', qrCodeId)
      .single();
    
    if (error || !data) {
      console.error('[scan.js] QR code not found or error occurred:', error);
      return;
    }
    
    qrCode = data;
    console.log('[scan.js] QR code details fetched:', qrCode);
    // Set referral cookie using the QR code owner ID for 30 days
    setCookie(referralCookieName, qrCode.owner_id, 30);
  } else {
    console.log('[scan.js] Referral cookie exists. Fetching QR code status...');
    let { data, error } = await supabase
      .from('qr_codes')
      .select('active, redirect_url')
      .eq('id', qrCodeId)
      .single();
    
    if (error || !data) {
      console.error('[scan.js] QR code not found or error occurred:', error);
      return;
    }
    qrCode = data;
    console.log('[scan.js] QR code status fetched:', qrCode);
  }
  
  // Log scan event into the 'qr_scans' table
  console.log('[scan.js] Logging scan event for QR code:', qrCodeId);
  const { error } = await supabase
  .from("scan_events")
  .insert([{ 
    qr_id: qrCodeId, 
    ip_address: ipAddress, // Ensure ip_address is defined; if not, remove this field.
    device_info: deviceInfo,
    location: geotag ? JSON.stringify(geotag) : null 
  }]);
  
  if (error) {
    console.error('[scan.js] Error logging scan event:', error);
  } else {
    console.log('[scan.js] Scan event recorded successfully.');
  }
  
  // Determine redirect URL
  let redirectUrl = 'https://uniqrn.co.uk'; // Default fallback URL
  if (qrCode.active) {
    redirectUrl = qrCode.redirect_url || 'https://yourdefaultdomain.com';
    console.log('[scan.js] QR code is active. Using redirect URL:', redirectUrl);
  } else {
    console.log('[scan.js] QR code is inactive. Using fallback redirect URL:', redirectUrl);
  }
  
  return redirectUrl;
}

// Listen for scan button click event
document.getElementById('scanButton').addEventListener('click', async () => {
  console.log('[scan.js] Scan button clicked.');
  // Retrieve the QR code ID from the input field
  const qrCodeId = document.getElementById('qrCodeId').value;
  console.log('[scan.js] QR code ID:', qrCodeId);
  
  // Optionally get geotag info; here we use a static example
  const geotag = { lat: 51.5074, lng: -0.1278 };
  console.log('[scan.js] Geotag information:', geotag);
  const deviceInfo = navigator.userAgent;
  console.log('[scan.js] Device info:', deviceInfo);
  
  const redirectUrl = await recordScan(qrCodeId, geotag, deviceInfo);
  console.log('[scan.js] Redirecting to:', redirectUrl);
  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
});
