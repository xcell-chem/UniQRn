// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[dashboard.js] Dashboard loaded.');

  // Get current user from Supabase authentication
  const user = supabase.auth.user();
  if (!user) {
    console.error('[dashboard.js] No user logged in.');
    return;
  }
  const userId = user.id;
  console.log('[dashboard.js] Current user id:', userId);

  // 1. Fetch Affiliate Codes:
  // These are codes where the user is the owner (registered) but not the creator.
  let { data: affiliateCodes, error: errorAffiliate } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('owner_id', userId)
    .neq('created_by', userId);

  if (errorAffiliate) {
    console.error('[dashboard.js] Error fetching affiliate codes:', errorAffiliate);
  } else {
    console.log('[dashboard.js] Affiliate codes:', affiliateCodes);
    renderCodes('affiliate-codes', affiliateCodes);
  }

  // 2. Fetch My Codes:
  // These are codes created by the user.
  let { data: myCodes, error: errorMyCodes } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('created_by', userId);

  if (errorMyCodes) {
    console.error('[dashboard.js] Error fetching my codes:', errorMyCodes);
  } else {
    console.log('[dashboard.js] My codes:', myCodes);
    renderCodes('my-codes', myCodes);
  }

  // 3. Fetch Special Codes:
  // Assuming these codes are marked in custom_data with a key { special: true }
  let { data: specialCodes, error: errorSpecial } = await supabase
    .from('qr_codes')
    .select('*')
    .contains('custom_data', { special: true });

  if (errorSpecial) {
    console.error('[dashboard.js] Error fetching special codes:', errorSpecial);
  } else {
    console.log('[dashboard.js] Special codes:', specialCodes);
    renderCodes('special-codes', specialCodes);
  }
});

// Helper function to render a list of codes into a given container element.
function renderCodes(elementId, codes) {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`[dashboard.js] No element found with id ${elementId}`);
    return;
  }
  container.innerHTML = '';
  if (!codes || codes.length === 0) {
    container.innerHTML = '<p>No codes found in this category.</p>';
    return;
  }
  const list = document.createElement('ul');
  codes.forEach(code => {
    const item = document.createElement('li');
    item.textContent = `ID: ${code.id} - Label: ${code.label || 'N/A'} - Active: ${code.active}`;
    list.appendChild(item);
  });
  container.appendChild(list);
  console.log(`[dashboard.js] Rendered ${codes.length} codes in ${elementId}`);
}
