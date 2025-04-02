// create.js

const supabase = window.supabaseClient; // use your initialized Supabase client

// Assume the current user ID is stored in window.currentUserId.
window.currentUserId = "f92c1e72-0ac2-4b9d-8722-65a08a9e6604"; // Replace with actual current user ID

// Utility to display feedback messages to the user.
function showFeedback(message, isError = false) {
  const feedbackEl = document.getElementById("feedback");
  feedbackEl.style.display = "block";
  feedbackEl.textContent = message;
  feedbackEl.style.color = isError ? "red" : "green";
  setTimeout(() => {
    feedbackEl.style.display = "none";
  }, 5000);
}

// Function to create new QR codes in bulk based on the quantity field.
async function createCodes() {
  const labelVal = document.getElementById("label").value || "Unlabeled";
  const redirectUrlVal = document.getElementById("redirect_url").value || null;
  const locationVal = document.getElementById("location").value || null;
  const custom1Val = document.getElementById("custom_1").value || null;
  const quantityVal = parseInt(document.getElementById("quantity").value) || 1;
  const activeVal = document.getElementById("active").checked;
  const singleUseVal = document.getElementById("single_use").checked;
  const preRegisterVal = document.getElementById("pre_register").checked;
  const ownerId = window.currentUserId;
  
  let createdCodes = [];
  
  // Create as many codes as specified by the quantity field.
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
      console.error("[create.js] Error creating code:", error);
      showFeedback("Error creating code. Please try again.", true);
      continue;
    }
    console.log("[create.js] Code created successfully:", data);
    createdCodes.push(data);
  }
  
  if (createdCodes.length > 0) {
    showFeedback(`Successfully created ${createdCodes.length} code(s)!`);
  }
  return createdCodes;
}

// Function to display a single code in the grid layout.
function displayCode(code) {
  if (!code) return; // Prevent errors if code is null
  const container = document.getElementById("generatedCodesContainer");
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  codeElement.innerHTML = `
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
    <p><strong>Registered:</strong> ${code.registered ? "Yes" : "No"}</p>
  `;
  container.appendChild(codeElement);
}

// Event listener for the "Create Code(s)" button.
document.getElementById("createCodeBtn").addEventListener("click", async () => {
  console.log("[create.js] Create Code(s) button clicked.");
  const codes = await createCodes();
  if (codes && codes.length > 0) {
    // Filter out any null values before displaying
    codes.filter(code => code !== null).forEach(displayCode);
  }
});

// Optional: Load existing codes for the current user on page load.
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
  container.innerHTML = ""; // Clear previous content.
  codes.forEach(displayCode);
}

// Uncomment the next line to load existing codes automatically on page load.
// window.addEventListener("DOMContentLoaded", loadUserCodes);
