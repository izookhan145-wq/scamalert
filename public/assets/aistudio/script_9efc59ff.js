/**
 * Scam Alert and Pashto Translator - Frontend JavaScript
 * ========================================================
 * This script handles:
 * 1. Live character counting in the textarea
 * 2. Sending the message to the backend for AI analysis
 * 3. Displaying results (classification, risk, reasons, translation, advice)
 * 4. Error handling and UI state management
 */

// ============================================
// DOM ELEMENT REFERENCES
// ============================================
const messageInput = document.getElementById("messageInput");
const charCount = document.getElementById("charCount");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingSection = document.getElementById("loadingSection");
const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");

// Result display elements
const classificationBadge = document.getElementById("classificationBadge");
const riskBadge = document.getElementById("riskBadge");
const reasonsList = document.getElementById("reasonsList");
const pashtoTranslation = document.getElementById("pashtoTranslation");
const safetyEnglish = document.getElementById("safetyEnglish");
const safetyPashto = document.getElementById("safetyPashto");

// ============================================
// CHARACTER COUNTER
// Updates the character count as user types
// ============================================
messageInput.addEventListener("input", function () {
    const count = this.value.length;
    charCount.textContent = count;

    // Change counter color when approaching limit
    if (count > 4500) {
        charCount.parentElement.style.color = "#d93025"; // Red when near limit
    } else if (count > 3500) {
        charCount.parentElement.style.color = "#f9ab00"; // Yellow as warning
    } else {
        charCount.parentElement.style.color = "#5f6368"; // Normal gray
    }
});

// ============================================
// ANALYZE MESSAGE
// Sends the message to the backend API
// ============================================
async function analyzeMessage() {
    // Get the message from textarea
    const message = messageInput.value.trim();

    // Validate: message must not be empty
    if (!message) {
        showError("Please paste a message to analyze.");
        return;
    }

    // Validate: message must not exceed 5000 characters
    if (message.length > 5000) {
        showError("Message is too long. Maximum 5000 characters allowed.");
        return;
    }

    // --- Show loading state ---
    showLoading(true);
    hideError();
    hideResults();
    analyzeBtn.disabled = true;

    try {
        // Send POST request to the backend
        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        // Parse the response JSON
        const data = await response.json();

        // Check if the response contains an error
        if (!response.ok || data.error) {
            showError(data.error || "Something went wrong. Please try again.");
            showLoading(false);
            analyzeBtn.disabled = false;
            return;
        }

        // Display the results
        displayResults(data);

    } catch (error) {
        // Handle network errors or other unexpected failures
        showError("Network error. Please check your connection and try again.");
        console.error("Analysis error:", error);
    } finally {
        // Always restore the UI state
        showLoading(false);
        analyzeBtn.disabled = false;
    }
}

// ============================================
// DISPLAY RESULTS
// Populates the result cards with AI response data
// ============================================
function displayResults(data) {
    // --- Classification Badge ---
    const classification = data.classification || "Unknown";
    classificationBadge.textContent = classification;

    // Set badge color based on classification
    classificationBadge.className = "badge";
    if (classification === "Likely Scam") {
        classificationBadge.classList.add("badge-red");
    } else if (classification === "Suspicious") {
        classificationBadge.classList.add("badge-yellow");
    } else {
        classificationBadge.classList.add("badge-green");
    }

    // --- Risk Level Badge ---
    const riskLevel = data.risk_level || "Unknown";
    riskBadge.textContent = riskLevel;

    // Set badge color based on risk level
    riskBadge.className = "badge";
    if (riskLevel === "High") {
        riskBadge.classList.add("badge-red");
    } else if (riskLevel === "Medium") {
        riskBadge.classList.add("badge-yellow");
    } else {
        riskBadge.classList.add("badge-green");
    }

    // --- Reasons List ---
    reasonsList.innerHTML = ""; // Clear previous reasons
    const reasons = data.reasons || [];
    if (reasons.length > 0) {
        reasons.forEach(function (reason) {
            const li = document.createElement("li");
            li.textContent = reason;
            reasonsList.appendChild(li);
        });
    } else {
        reasonsList.innerHTML = "<li>No specific reasons provided.</li>";
    }

    // --- Pashto Translation ---
    pashtoTranslation.textContent = data.pashto_translation || "Translation not available.";

    // --- Safety Advice in English ---
    safetyEnglish.innerHTML = ""; // Clear previous advice
    const adviceEn = data.safety_advice_english || [];
    if (adviceEn.length > 0) {
        adviceEn.forEach(function (tip) {
            const li = document.createElement("li");
            li.textContent = tip;
            safetyEnglish.appendChild(li);
        });
    } else {
        safetyEnglish.innerHTML = "<li>No specific advice available.</li>";
    }

    // --- Safety Advice in Pashto ---
    safetyPashto.innerHTML = ""; // Clear previous advice
    const advicePs = data.safety_advice_pashto || [];
    if (advicePs.length > 0) {
        advicePs.forEach(function (tip) {
            const li = document.createElement("li");
            li.textContent = tip;
            safetyPashto.appendChild(li);
        });
    } else {
        safetyPashto.innerHTML = "<li>مشورې شتون نلري.</li>"; // "No advice available" in Pashto
    }

    // --- Show the results section ---
    resultsSection.classList.remove("hidden");

    // Scroll to results smoothly
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================
// CLEAR ALL
// Resets the form and hides all results
// ============================================
function clearAll() {
    // Clear the textarea
    messageInput.value = "";
    charCount.textContent = "0";
    charCount.parentElement.style.color = "#5f6368";

    // Hide all result sections
    hideResults();
    hideError();
    showLoading(false);

    // Re-enable the analyze button
    analyzeBtn.disabled = false;

    // Focus back on the textarea for convenience
    messageInput.focus();
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show or hide the loading spinner
 */
function showLoading(show) {
    if (show) {
        loadingSection.classList.remove("hidden");
    } else {
        loadingSection.classList.add("hidden");
    }
}

/**
 * Display an error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove("hidden");
}

/**
 * Hide the error message
 */
function hideError() {
    errorSection.classList.add("hidden");
}

/**
 * Hide the results section
 */
function hideResults() {
    resultsSection.classList.add("hidden");
}

// ============================================
// KEYBOARD SHORTCUT
// Press Ctrl+Enter to analyze the message
// ============================================
messageInput.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "Enter") {
        analyzeMessage();
    }
});
