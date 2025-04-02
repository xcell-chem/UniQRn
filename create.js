// create.js

const supabase = window.supabaseClient; // use your initialized Supabase client

// Assume the current user ID is stored in window.currentUserId.
// In your actual project, set this value after user login.
window.currentUserId = "f92c1e72-0ac2-4b9d-8722-65a08a9e6604"; // example

// Function to create a new QR code record.
async function createCode() {
  // Collect form data
  const labelVal = document.getElementById("label").value || "Unlabeled";
  const redirectUrlVal = document.getElementById("redirect_url").value || null;
  const locationVal = document.getElementById("location").value || null;
  const custom1Val = document.getElementById("custom_1").value || null;
  const activeVal = document.getElementById("active").checked;
  const singleUseVal = document.getElementById("single_use").checked;
  const ownerId = window.currentUserId;
  
  // Insert new QR code record. Adjust other fields as needed.
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
      registered: false,  // New codes start as unregistered.
      created_by: ownerId
    }])
    .single();
    
  if (error) {
    console.error("[create.js] Error creating code:", error);
    alert("Error creating code.");
    return null;
  }
  
  console.log("[create.js] Code created successfully:", data);
  return data;
}

// Function to display a generated code in a grid layout.
function displayCode(code) {
  const container = document.getElementById("generatedCodesContainer");
  
  // Create a code item element.
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  
  // Customize the content as needed.
  codeElement.innerHTML = `
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
  `;
  
  // Append the code element to the container.
  container.appendChild(codeElement);
}

// Event listener for the "Create Code" button.
document.getElementById("createCodeBtn").addEventListener("click", async () => {
  console.log("[create.js] Create Code button clicked.");
  const newCode = await createCode();
  if (newCode) {
    displayCode(newCode);
  }
});

// Optional: Load existing codes on page load.
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
  container.innerHTML = ""; // Clear existing codes.
  codes.forEach(displayCode);
}

// Uncomment to load existing codes automatically on page load.
// window.addEventListener("DOMContentLoaded", loadUserCodes);
