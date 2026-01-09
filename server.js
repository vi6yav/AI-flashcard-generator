require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <--- LINE 4: Add this
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const mongoURI = process.env.MONGODB_URI;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const app = express();
app.use(cors()); // <--- LINE 8: Add this right here!

// 2. MIDDLEWARE & STATIC FILES (Fixes 404)
app.use(express.json());
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Explicit route to ensure index.html is found
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// 3. GENERATE ROUTE (With 2026 Retry Logic & Unified Interface)
app.post('/generate', async (req, res) => {
    const { topicName, sourceText } = req.body;
    try {
        // Change your prompt variable to this:
const prompt = `Create flashcards for ${topicName} based on the following text: ${sourceText}. 
Return ONLY a valid JSON array of objects. Do not include any conversational text or markdown code blocks like \`\`\`json.
Each object must have "question" and "answer" keys.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Clean the text in one single go
        let text = response.text().replace(/```json|```/g, "").trim();

        // This is where 'ai' usually sneaks in. Use 'text' instead.
        const flashcards = JSON.parse(text); 
        return res.json(flashcards);

    } catch (error) {
        console.error("Final Error:", error.message);
        // This ensures the browser can find the 'length' of the cards
return res.json({ success: true, count: flashcards.length, data: flashcards });
    }
});
// 4. DATABASE & SERVER START
const PORT = 3000;
mongoose.connect(mongoURI)
    .then(() => app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`)))
    .catch(err => console.log("❌ DB Connection Error:", err));