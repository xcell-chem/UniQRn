// create.js

const supabase = window.supabaseClient; // Using the initialized Supabase client

// For this example, assume the current user ID is stored in window.currentUserId.
window.currentUserId = "f92c1e72-0ac2-4b9d-8722-65a08a9e6604"; // Replace with actual current user ID

// Utility function to show feedback messages to the user.
function showFeedback(message, isError = false) {
  const feedbackEl = document.getElementById("feedback");
  if (!feedbackEl) {
    console.error("Feedback element not found.");
    return;
  }
  feedbackEl.style.display = "block";
  feedbackEl.textContent = message;
  feedbackEl.style.color = isError ? "red" : "green";
  console.log("[create.js] Feedback:", message);
  setTimeout(() => {
    feedbackEl.style.display = "none";
  }, 5000);
}

// Function to create new QR codes in bulk based on the quantity field.
async function createCodes() {
  console.log("[create.js] Starting code creation process...");

  const labelVal = document.getElementById("label").value || "Unlabeled";
  const redirectUrlVal = document.getElementById("redirect_url").value || null;
  const locationVal = document.getElementById("location").value || null;
  const custom1Val = document.getElementById("custom_1").value || null;
  const quantityVal = parseInt(document.getElementById("quantity").value) || 1;
  const activeVal = document.getElementById("active").checked;
  const singleUseVal = document.getElementById("single_use").checked;
  const preRegisterVal = document.getElementById("pre_register").checked;
  const ownerId = window.currentUserId;
  
  console.log("[create.js] Form data:", {
    labelVal, redirectUrlVal, locationVal, custom1Val, quantityVal, activeVal, singleUseVal, preRegisterVal, ownerId
  });
  
  let createdCodes = [];
  
  for (let i = 0; i < quantityVal; i++) {
    const { data, error } = await supabase
      .from("qr_codes")
      .insert([{
        owner_id: ownerId,
        label: labelVal,
        redirect_url: redirectUrlVal,
        shared_location: locationVal,
        custom_1: custom1Val,
        active: activeVal,
        single_use: singleUseVal,
        registered: preRegisterVal ? true : false,
        created_by: ownerId
      }])
      .single();
    
    if (error) {
      console.error(`[create.js] Error creating code (iteration ${i}):`, error);
      showFeedback("Error creating code. Please try again.", true);
      continue;
    }
    console.log(`[create.js] Code created successfully (iteration ${i}):`, data);
    createdCodes.push(data);
  }
  
  if (createdCodes.length > 0) {
    showFeedback(`Successfully created ${createdCodes.length} code(s)!`);
  } else {
    showFeedback("No codes were created.", true);
  }
  return createdCodes;
}

// Function to display a single code in the grid layout with debugging.
function displayCode(code) {
  if (!code) {
    console.error("[create.js] displayCode called with null code");
    return;
  }
  
  const container = document.getElementById("generatedCodesContainer");
  if (!container) {
    console.error("[create.js] Container 'generatedCodesContainer' not found");
    return;
  }
  
  // Generate QR code preview URL (using code id here; change data as needed)
  const dataToEncode = code.id;
  const qrPreviewUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(dataToEncode)}&size=150x150`;
  console.log(`[create.js] Generated QR preview URL for code ${code.id}:`, qrPreviewUrl);
  
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  
  const img = document.createElement("img");
  img.src = qrPreviewUrl;
  img.alt = "QR Code Preview";
  img.style.width = "150px";
  img.style.height = "150px";
  img.style.display = "block";
  img.style.margin = "0 auto 10px";
  
  img.addEventListener("load", () => {
    console.log(`[create.js] QR preview image loaded for code ${code.id}`);
  });
  img.addEventListener("error", (err) => {
    console.error(`[create.js] Error loading QR preview image for code ${code.id}:`, err);
  });
  
  const detailsHTML = `
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
    <p><strong>Registered:</strong> ${code.registered ? "Yes" : "No"}</p>
  `;
  console.log(`[create.js] Code details for ${code.id}:`, detailsHTML);
  
  codeElement.appendChild(img);
  // Append details as innerHTML to preserve formatting.
  codeElement.innerHTML += detailsHTML;
  
  container.appendChild(codeElement);
  console.log(`[create.js] Displayed code with ID ${code.id}`);
}

// Event listener for the "Create Code(s)" button.
document.getElementById("createCodeBtn").addEventListener("click", async () => {
  console.log("[create.js] Create Code(s) button clicked.");
  const codes = await createCodes();
  if (codes && codes.length > 0) {
    codes.filter(code => code !== null).forEach(displayCode);
  }
});

// Optional: Function to load existing codes on page load.
async function loadUserCodes() {
  const { data: codes, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_id", window.currentUserId);
  if (error) {
    console.error("[create.js] Error loading user codes:", error);
    return;
  }
  console.log("[create.js] Loaded user codes:", codes);
  const container = document.getElementById("generatedCodesContainer");
  container.innerHTML = "";
  codes.forEach(displayCode);
}

// Uncomment to load existing codes automatically:
// window.addEventListener("DOMContentLoaded", loadUserCodes);
