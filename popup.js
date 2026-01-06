const GEMINI_API_KEY = "YOUR_ACTUAL_API_KEY_HERE";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

document.getElementById('generateBtn').addEventListener('click', async () => {
    const status = document.getElementById('status');
    status.innerText = "Reading... 🔍";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, async (response) => {
            if (response && response.text) {
                status.innerText = "Thinking... ✨";
                
                const aiResponse = await fetch(GEMINI_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ 
                            parts: [{ text: `Create 3 Q&A flashcards from this: ${response.text.substring(0, 1000)}` }] 
                        }]
                    })
                });

                const data = await aiResponse.json();
                console.log("AI Response Data:", data); // Check the Inspect console for this!

                if (data.candidates && data.candidates[0].content) {
                    status.innerText = data.candidates[0].content.parts[0].text;
                } else {
                    status.innerText = "AI empty response. Check API key.";
                }
            } else {
                status.innerText = "Error: Refresh the page!";
            }
        });
    } catch (error) {
        status.innerText = "System Error.";
        console.error(error);
    }
});