const GEMINI_API_KEY = "PASTE_KEY_HERE";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

document.getElementById('generateBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.innerText = "Reading... 🔍";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, async (response) => {
        if (response && response.text) {
            status.innerText = "Thinking... ✨";
            const aiResponse = await fetch(GEMINI_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Summarize 3 flashcards: ${response.text.substring(0, 1000)}` }] }] })
            });
            const data = await aiResponse.json();
            status.innerText = data.candidates[0].content.parts[0].text;
        } else {
            status.innerText = "Error: Refresh the page!";
        }
    });
});