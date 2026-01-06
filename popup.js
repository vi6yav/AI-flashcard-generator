document.getElementById('generateBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.innerText = "Reading page content... 🔍";

    // 1. Find the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Send a message to content.js to get the text
    chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, (response) => {
        if (response && response.text) {
            status.innerText = "Text captured! Sending to AI... ✨";
            console.log("Captured Text:", response.text.substring(0, 100) + "...");
            // Call the Gemini API with the captured text
        } else {
            status.innerText = "Error: Could not read page.";
        }
    });
});