const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
const form = document.getElementById("create-form");
const previewContainer = document.getElementById("qrcode-preview-container");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const qty = parseInt(document.getElementById("quantity").value);
  const redirect_url = document.getElementById("redirect_url").value.trim();
  const group = document.getElementById("group").value.trim();
  const custom_1 = document.getElementById("custom_1").value.trim();
  const active = document.getElementById("active").checked;
  const single_use = document.getElementById("single_use").checked;
  const registered = document.getElementById("registered").checked;

  if (!qty || qty < 1 || qty > 100) return alert("Please enter a quantity between 1–100.");

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return alert("Please log in first.");

  previewContainer.innerHTML = "";
  const qrData = [];

  for (let i = 0; i < qty; i++) {
    const id = crypto.randomUUID();
    const fullURL = `https://UniQRn.co.uk/?id=${id}`;

    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, fullURL, { width: 120 });

    const block = document.createElement("div");
    block.className = "qr-block";
    block.appendChild(canvas);

    const idText = document.createElement("div");
    idText.className = "qr-id";
    idText.textContent = id.slice(0, 8);
    block.appendChild(idText);

    previewContainer.appendChild(block);

    qrData.push({
      id,
      owner_id: user.id,
      redirect_url: redirect_url || null,
      label: group || null,
      custom_1: custom_1 || null,
      active,
      single_use,
      registered,
      created_by: user.id
    });
  }

  const { error } = await supabase.from("qr_codes").insert(qrData);

  if (error) {
    console.error("❌ Error saving QR codes:", error);
    alert("Some error occurred while saving QR codes.");
  } else {
    alert(`✅ Successfully created ${qrData.length} QR codes.`);
  }
});
