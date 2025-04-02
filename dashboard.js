// dashboard.js

const supabase = window.supabaseClient; // use the initialized Supabase client
let user = null;
let allCodes = []; // holds codes with scan details for folder tree

// Load dashboard data and render folder tree with expandable code rows
async function loadDashboard() {
  console.log("[dashboard.js] Loading dashboard...");

  // Retrieve session and user info
  const { data: { session } } = await supabase.auth.getSession();
  user = session?.user;
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

  // Parallel queries: load affiliate codes, my codes, and user balance
  const [
    { data: affiliateCodes, error: affiliateError },
    { data: myCodes, error: myCodesError },
    { data: userInfo, error: userError }
  ] = await Promise.all([
    supabase.from("qr_codes").select("*").eq("owner_id", user.id).neq("created_by", user.id),
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

  // Combine codes; if a code is both created and registered, it appears only under "My Codes"
  allCodes = [...myCodes, ...affiliateCodes];

  // Process each QR code: retrieve scan events and compute counts
  for (const qr of allCodes) {
    console.log(`[dashboard.js] Querying scan events for QR code ID: ${qr.id}`);
    const { data: events, error: eventsError } = await supabase
      .from("scan_events")
      .select("referred_signup, scanned_at, ip_address, device_info")
      .eq("qr_code_id", qr.id);
      
    if (eventsError) {
      console.error(`[dashboard.js] Error loading scan events for ${qr.id}:`, eventsError);
    } else {
      console.log(`[dashboard.js] Retrieved ${events ? events.length : 0} scan events for ${qr.id}`);
    }
    const scans = events ? events.length : 0;
    const referrals = events ? events.filter(e => e.referred_signup).length : 0;
    Object.assign(qr, { scans, referrals, events });
  }
  
  // Build and render folder tree using the 'label' field (split on "/")
  const tree = buildFolderTree(allCodes);
  console.log("[dashboard.js] Folder Tree Structure:", tree);
  renderFolderTree(tree, document.getElementById("folders"));
}

// Builds a folder tree structure from codes based on the 'label' field
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
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>ID</th>
          <th>Location</th>
          <th>Redirect</th>
          <th>Scans</th>
          <th>Referrals</th>
          <th>Active</th>
          <th>Single Use</th>
          <th>Actions</th>
        </tr>
      `;
      table.appendChild(thead);
      
      const tbody = document.createElement("tbody");
      folder.__codes.forEach(qr => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${qr.id}</td>
          <td>${qr.shared_location || ""}</td>
          <td><a href="${qr.redirect_url || "#"}" target="_blank">${qr.redirect_url || ""}</a></td>
          <td>${qr.scans}</td>
          <td>${qr.referrals}</td>
          <td>${qr.active ? "✅" : "❌"}</td>
          <td>${qr.single_use ? "☑️" : ""}</td>
          <td><button class="toggle-scans-btn">Show Scans</button></td>
        `;
        tbody.appendChild(row);
        
        // Create a hidden row for detailed scan events
        const detailsRow = document.createElement("tr");
        detailsRow.style.display = "none";
        const detailsCell = document.createElement("td");
        detailsCell.colSpan = 8;
        detailsCell.innerHTML = `<div class="scan-details">Loading scan events...</div>`;
        detailsRow.appendChild(detailsCell);
        tbody.appendChild(detailsRow);
        
        // Toggle detailed view on button click
        const toggleBtn = row.querySelector(".toggle-scans-btn");
        toggleBtn.addEventListener("click", async () => {
          if (detailsRow.style.display === "none") {
            if (!detailsCell.dataset.loaded) {
              console.log(`[dashboard.js] Loading detailed scan events for code ${qr.id}`);
              const events = qr.events || [];
              if (events.length === 0) {
                detailsCell.innerHTML = "<em>No scan events found.</em>";
              } else {
                let eventsHTML = `
                  <table class="events-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>IP Address</th>
                        <th>Device Info</th>
                        <th>Referred Signup</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${events.map(ev => `
                        <tr>
                          <td>${ev.scanned_at || ""}</td>
                          <td>${ev.ip_address || ""}</td>
                          <td>${ev.device_info || ""}</td>
                          <td>${ev.referred_signup ? "Yes" : "No"}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                `;
                detailsCell.innerHTML = eventsHTML;
              }
              detailsCell.dataset.loaded = "true";
            }
            detailsRow.style.display = "table-row";
            toggleBtn.textContent = "Hide Scans";
          } else {
            detailsRow.style.display = "none";
            toggleBtn.textContent = "Show Scans";
          }
        });
      });
      table.appendChild(tbody);
      content.appendChild(table);
    }
    
    // Recursively render subfolders if they exist
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

// Filter folder tree based on search input
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

// Attach search event listener and load dashboard on startup
document.getElementById("search").addEventListener("input", filterFolders);
loadDashboard();

// Expose login and logout functions globally for inline handlers
window.login = login;
window.logout = logout;
