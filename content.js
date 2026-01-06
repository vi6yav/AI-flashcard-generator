// This script runs on the actual webpage
console.log("Content script loaded and ready to read text! 📖");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageText") {
        // This grabs all the text from the body of the website
        const text = document.body.innerText;
        sendResponse({ text: text });
    }
});