// dashboard.js

const supabase = window.supabaseClient; // use the initialized client from supabaseClient.js
let user = null;
let allCodes = []; // to store codes with scan/referral counts for folder tree

async function loadDashboard() {
  console.log("[dashboard.js] Loading dashboard...");

  // Retrieve current session/user
  const { data: sessionData } = await supabase.auth.getSession();
  user = sessionData?.session?.user;
  if (!user) {
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user;
  }
  
  if (!user) {
    console.error("[dashboard.js] User not logged in.");
    document.body.innerHTML = `<h2>🔐 Please log in to access your dashboard.</h2><button onclick="login()">Login with Google</button>`;
    return;
  }
  
  console.log("[dashboard.js] Logged in as:", user.email);

  // Parallel queries: load Affiliate Codes, My Codes, and user balance info
  const [
    { data: affiliateCodes, error: affiliateError },
    { data: myCodes, error: myCodesError },
    { data: userInfo, error: userError }
  ] = await Promise.all([
    // Affiliate Codes: owner_id equals user.id and created_by is not equal to user.id
    supabase.from("qr_codes").select("*").eq("owner_id", user.id).neq("created_by", user.id),
    // My Codes: codes created by the user
    supabase.from("qr_codes").select("*").eq("created_by", user.id),
    supabase.from("app_users").select("coin_balance, free_credits, purchased_credits").eq("id", user.id).single()
  ]);
  
  if (affiliateError) {
    console.error("[dashboard.js] Failed to load affiliate codes:", affiliateError);
    alert("Unable to load affiliate codes.");
    return;
  }
  if (myCodesError) {
    console.error("[dashboard.js] Failed to load my codes:", myCodesError);
    alert("Unable to load my codes.");
    return;
  }
  if (userError) {
    console.error("[dashboard.js] Failed to load user info:", userError);
  }
  
  // Display user balance information
  const balancesText = `💰 Coins: ${userInfo?.coin_balance || 0} | 🖨️ Free credits: ${userInfo?.free_credits || 0} | Purchased: ${userInfo?.purchased_credits || 0}`;
  document.getElementById("balances").innerText = balancesText;
  console.log("[dashboard.js] User balances:", balancesText);
  
  console.log(`[dashboard.js] Loaded ${affiliateCodes.length} affiliate codes.`);
  console.log("[dashboard.js] Affiliate Codes Data:", affiliateCodes);
  console.log(`[dashboard.js] Loaded ${myCodes.length} my codes.`);
  console.log("[dashboard.js] My Codes Data:", myCodes);

  // Combine codes for folder tree display.
  // You might choose to show them in separate sections, but here we combine and then render the folder tree.
  allCodes = [...myCodes, ...affiliateCodes];

  // Process each QR code to retrieve scan/referral counts
  for (const qr of allCodes) {
    const { data: events, error: eventsError } = await supabase
      .from("scan_events")
      .select("referred_signup")
      .eq("qr_code_id", qr.id);
    
    if (eventsError) {
      console.error(`[dashboard.js] Error loading scan events for ${qr.id}:`, eventsError);
    }
    
    const scans = events ? events.length : 0;
    const referrals = events ? events.filter(e => e.referred_signup).length : 0;
    Object.assign(qr, { scans, referrals });
  }
  
  // Build folder tree from codes using their label
  const tree = buildFolderTree(allCodes);
  console.log("[dashboard.js] Folder Tree Structure:", tree);
  
  // Render the folder tree into the container element with id "folders"
  renderFolderTree(tree, document.getElementById("folders"));
}

// Builds a folder tree based on the "label" field (split by "/")
function buildFolderTree(codes) {
  const root = {};
  
  codes.forEach(qr => {
    const labelPath = (qr.label || "Unlabeled").split("/").map(s => s.trim());
    let node = root;
    
    labelPath.forEach((part, index) => {
      if (!node[part]) {
        node[part] = { __codes: [], __subfolders: {} };
      }
      if (index === labelPath.length - 1) {
        node[part].__codes.push(qr);
      } else {
        node = node[part].__subfolders;
      }
    });
  });
  
  return root;
}

// Renders the folder tree recursively into a container element
function renderFolderTree(tree, container) {
  container.innerHTML = "";
  
  for (const folderName in tree) {
    const folder = tree[folderName];
    const wrapper = document.createElement("div");
    wrapper.className = "folder";
    
    const totalScans = folder.__codes.reduce((acc, code) => acc + code.scans, 0);
    const totalReferrals = folder.__codes.reduce((acc, code) => acc + code.referrals, 0);
    
    const header = document.createElement("div");
    header.className = "folder-header";
    header.textContent = `${folderName} (${folder.__codes.length} codes, ${totalScans} scans, ${totalReferrals} referrals)`;
    console.log(`[dashboard.js] Folder: ${folderName}, Codes: ${folder.__codes.length}`, folder.__codes);
    
    const content = document.createElement("div");
    content.className = "folder-content";
    
    if (folder.__codes.length > 0) {
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Location</th>
            <th>Redirect</th>
            <th>Scans</th>
            <th>Referrals</th>
            <th>Active</th>
            <th>Single Use</th>
          </tr>
        </thead>
        <tbody>
          ${folder.__codes.map(qr => `
            <tr>
              <td>${qr.id}</td>
              <td>${qr.shared_location || ""}</td>
              <td><a href="${qr.redirect_url || "#"}" target="_blank">${qr.redirect_url || ""}</a></td>
              <td>${qr.scans}</td>
              <td>${qr.referrals}</td>
              <td>${qr.active ? "✅" : "❌"}</td>
              <td>${qr.single_use ? "☑️" : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
      content.appendChild(table);
    }
    
    // Render subfolders recursively
    if (folder.__subfolders && Object.keys(folder.__subfolders).length > 0) {
      renderFolderTree(folder.__subfolders, content);
    }
    
    header.onclick = () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    };
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    container.appendChild(wrapper);
  }
}

// Filters codes based on the search query and re-renders the folder tree
function filterFolders() {
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = allCodes.filter(qr =>
    qr.id.toLowerCase().includes(query) ||
    (qr.shared_location || "").toLowerCase().includes(query) ||
    (qr.label || "").toLowerCase().includes(query) ||
    (qr.redirect_url || "").toLowerCase().includes(query)
  );
  const tree = buildFolderTree(filtered);
  renderFolderTree(tree, document.getElementById("folders"));
}

// Login and logout functions remain unchanged
async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}
async function login() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: 'https://uniqrn.co.uk/auth.html' }
  });
}

// Attach the search event listener
document.getElementById("search").addEventListener("input", filterFolders);

// Load the dashboard on startup
loadDashboard();
