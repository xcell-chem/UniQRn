async function loadHeader() {
  const headerHTML = `
    <header>
      <img src="https://catlvxqphrmicnjzbyal.supabase.co/storage/v1/object/public/images//logo.png" alt="UniQRn Logo" class="logo">
      <div id="balances">Loading balances...</div>
      <div class="nav">
        <a href="index.html">🏠 Home</a>
        <button onclick="logout()">🔒 Logout</button>
      </div>
    </header>
  `;
  document.body.insertAdjacentHTML('afterbegin', headerHTML);

  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_KEY;
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    document.getElementById('balances').innerText = '💰 Please log in to see balances';
    return;
  }

  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabaseClient
    .from('app_users')
    .select('coin_balance, free_credits, purchased_credits')
    .eq('id', userId)
    .single();

  if (error || !data) {
    document.getElementById('balances').innerText = '💰 Unable to load balances';
  } else {
    document.getElementById('balances').innerHTML = `
      💰 Coins: <span id="coin-balance">${data.coin_balance}</span> |
      🖨 Free credits: <span id="free-print-balance">${data.free_credits}</span> |
      Purchased: <span id="purchased-print-balance">${data.purchased_credits}</span>
    `;
  }
}
