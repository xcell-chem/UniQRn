// Function to display a single code in the grid layout with detailed debugging.
function displayCode(code) {
  if (!code) {
    console.error("[create.js] displayCode called with null code");
    return;
  }
  
  const container = document.getElementById("generatedCodesContainer");
  if (!container) {
    console.error("[create.js] generatedCodesContainer not found");
    return;
  }
  
  // Generate the QR code preview URL using a free API.
  // Here we're encoding the code's id; you can change this to encode different data.
  const dataToEncode = code.id;
  const qrPreviewUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(dataToEncode)}&size=150x150`;
  console.log("[create.js] Generated QR preview URL:", qrPreviewUrl);
  
  // Create a container element for the code item.
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  
  // Create the image element for the QR code preview.
  const img = document.createElement("img");
  img.src = qrPreviewUrl;
  img.alt = "QR Code Preview";
  img.style.width = "150px";
  img.style.height = "150px";
  img.style.display = "block";
  img.style.margin = "0 auto 10px";
  
  // Attach load and error event handlers to debug image loading.
  img.addEventListener("load", () => {
    console.log(`[create.js] QR preview image loaded successfully for code ${code.id}`);
  });
  img.addEventListener("error", (err) => {
    console.error(`[create.js] Error loading QR preview image for code ${code.id}`, err);
  });
  
  // Build the inner HTML for the code details.
  const detailsHTML = `
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
    <p><strong>Registered:</strong> ${code.registered ? "Yes" : "No"}</p>
  `;
  console.log("[create.js] Code details:", detailsHTML);
  
  // Append the image and details to the code element.
  codeElement.appendChild(img);
  codeElement.innerHTML += detailsHTML;
  
  // Append the code element to the container.
  container.appendChild(codeElement);
  
  console.log(`[create.js] Displayed code with ID ${code.id} in the grid.`);
}
