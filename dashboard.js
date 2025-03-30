const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  let user = null;
  let allCodes = [];

  async function loadDashboard() {
    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData?.session?.user;

    if (!user) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user;
    }

    if (!user) {
      document.body.innerHTML = `<h2>🔐 Please log in to access your dashboard.</h2><button onclick="login()">Login with Google</button>`;
      return;
    }

    console.log("🔑 Logged in as:", user.email);

    const [{ data: qrCodes, error }, { data: userInfo }] = await Promise.all([
      supabase.from("qr_codes").select("*").eq("owner_id", user.id),
      supabase.from("app_users").select("coin_balance, free_credits, purchased_credits").eq("id", user.id).single()
    ]);

    if (error || !Array.isArray(qrCodes)) {
      console.error("❌ Failed to load QR codes:", error);
      alert("Unable to load QR codes.");
      return;
    }

    document.getElementById("balances").innerText =
      `💰 Coins: ${userInfo?.coin_balance || 0} | 🖨️ Free credits: ${userInfo?.free_credits || 0} | Purchased: ${userInfo?.purchased_credits || 0}`;

    console.log(`📦 Loaded ${qrCodes.length} QR codes.`);
    console.log("📦 QR Code Data:", qrCodes);

    allCodes = [];

    for (const qr of qrCodes) {
      const { data: events } = await supabase
        .from("scan_events")
        .select("referred_signup")
        .eq("qr_id", qr.id);

      allCodes.push({
        ...qr,
        scans: events?.length || 0,
        referrals: events?.filter(e => e.referred_signup).length || 0
      });
    }

    const tree = buildFolderTree(allCodes);
    console.log("🗂️ Folder Tree Structure:", tree);
    renderFolderTree(tree, document.getElementById("folders"));
  }

  function buildFolderTree(codes) {
    const root = {};

    for (const qr of codes) {
      const labelPath = (qr.label || "Unlabeled").split("/").map(s => s.trim());
      let node = root;

      for (let i = 0; i < labelPath.length; i++) {
        const part = labelPath[i] || "Unlabeled";
        if (!node[part]) node[part] = { __codes: [], __subfolders: {} };

        if (i === labelPath.length - 1) {
          node[part].__codes.push(qr);
        } else {
          node = node[part].__subfolders;
        }
      }
    }

    return root;
  }

  function renderFolderTree(tree, container) {
    container.innerHTML = "";

    for (const folderName in tree) {
      const folder = tree[folderName];
      const wrapper = document.createElement("div");
      wrapper.className = "folder";

      const totalScans = folder.__codes.reduce((a, b) => a + b.scans, 0);
      const totalReferrals = folder.__codes.reduce((a, b) => a + b.referrals, 0);

      const header = document.createElement("div");
      header.className = "folder-header";
      header.textContent = `${folderName} (${folder.__codes.length} codes, ${totalScans} scans, ${totalReferrals} referrals)`;
      console.log(`📁 Folder: ${folderName}, Codes: ${folder.__codes.length}`, folder.__codes);

      const content = document.createElement("div");
      content.className = "folder-content";

      if (folder.__codes.length > 0) {
        const table = document.createElement("table");
        const rows = folder.__codes.map(qr => `
          <tr>
            <td>${qr.id}</td>
            <td>${qr.shared_location || ""}</td>
            <td><a href="${qr.redirect_url || "#"}" target="_blank">${qr.redirect_url || ""}</a></td>
            <td>${qr.scans}</td>
            <td>${qr.referrals}</td>
            <td>${qr.active ? "✅" : "❌"}</td>
            <td>${qr.single_use ? "☑️" : ""}</td>
          </tr>
        `).join("");

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
          <tbody>${rows}</tbody>
        `;
        content.appendChild(table);
      }

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

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href }
    });
  }

  document.getElementById("search").addEventListener("input", filterFolders);
  loadDashboard();