// create.js

const supabase = window.supabaseClient; // Using the initialized client

// Function to create a new QR code record in the database.
async function createCode() {
  // You might collect additional form data here if needed.
  // For simplicity, we'll just insert a new QR code with default values.
  const { data, error } = await supabase
    .from("qr_codes")
    .insert([{
      owner_id: /* set current user id if needed, e.g. */ window.currentUserId, // ensure this is defined
      label: document.getElementById("label")?.value || "Unlabeled",
      redirect_url: document.getElementById("redirect_url")?.value || null,
      active: true,
      registered: false, // Initially unregistered until claimed
      created_by: window.currentUserId // assuming current user is the creator
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

// Function to display a code in the grid container.
function displayCode(code) {
  const container = document.getElementById("generatedCodesContainer");

  // Create an element for the code.
  const codeElement = document.createElement("div");
  codeElement.className = "code-item";
  // Customize what you want to display. For example:
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

// Optionally, if you want to load all codes for the current user when the page loads:
async function loadUserCodes() {
  // Ensure you have the current user id stored somewhere, e.g., window.currentUserId
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

// Optionally, call loadUserCodes() on page load if you want to display existing codes.
// window.addEventListener("DOMContentLoaded", loadUserCodes);
