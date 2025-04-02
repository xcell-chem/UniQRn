// Function to display a single code in the grid layout.
function displayCode(code) {
  if (!code) return; // Prevent errors if code is null
  const container = document.getElementById("generatedCodesContainer");
  
  // Generate QR code preview URL using a free QR code API.
  // Here we encode the code ID; adjust as needed (e.g., you might encode the redirect URL instead).
  const qrPreviewUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code.id)}&size=150x150`;
  
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  codeElement.innerHTML = `
    <img src="${qrPreviewUrl}" alt="QR Code Preview" style="width:150px; height:150px; display:block; margin:0 auto 10px;"/>
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
    <p><strong>Registered:</strong> ${code.registered ? "Yes" : "No"}</p>
  `;
  container.appendChild(codeElement);
}
