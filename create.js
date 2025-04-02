// create.js

const supabase = window.supabaseClient; // use your initialized Supabase client

// Function to create a new QR code record in the database.
async function createCode() {
  // You might collect additional form data if needed.
  // For this example, we use form fields "label" and "redirect_url".
  const labelVal = document.getElementById("label").value || "Unlabeled";
  const redirectUrlVal = document.getElementById("redirect_url").value || null;
  // Assume you have the current user's ID stored in window.currentUserId.
  // You should set window.currentUserId when the user logs in.
  const ownerId = window.currentUserId; 

  const { data, error } = await supabase
    .from("qr_codes")
    .insert([{
      owner_id: ownerId,
      label: labelVal,
      redirect_url: redirectUrlVal,
      active: true,
      registered: false, // Initially, the code is unregistered until claimed.
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

// Function to display a newly created code in the grid container.
function displayCode(code) {
  const container = document.getElementById("generatedCodesContainer");

  // Create an element for the code.
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  codeElement.innerHTML = `
    <p><strong>ID:</strong> ${code.id}</p>
    <p><strong>Label:</strong> ${code.label || "Unlabeled"}</p>
    <p><strong>Redirect:</strong> ${code.redirect_url || "None"}</p>
  `;

  // Append the new code element to the container.
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

// Optionally, load existing codes on page load.
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

// Uncomment the next line to load existing codes when the page loads.
// window.addEventListener("DOMContentLoaded", loadUserCodes);
