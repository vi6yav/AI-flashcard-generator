require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenAI } = require('@google/genai'); // Using the 2026 Unified SDK

const app = express();
const PORT = 5500;

// 1. INITIALIZE CLIENT (Picked up automatically from GEMINI_API_KEY in .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
        try {
            // New unified syntax: ai.models.generateContent
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite', // Using 1.5-flash for higher free-tier quota
                contents: `Generate 10 flashcards (JSON format: [{question, answer}]) for topic: ${topicName}. Context: ${sourceText}`,
                config: { responseMimeType: 'application/json' }
            });

            const flashcards = JSON.parse(response.text);
            return res.json({ success: true, data: flashcards });

        } catch (error) {
            // 429 = Resource Exhausted (Rate Limit)
            if (error.status === 429 && attempts < maxRetries - 1) {
                attempts++;
                console.log(`⚠️ Rate limit hit. Retrying in 5s... (Attempt ${attempts})`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second cooldown
            } else {
                console.error("Final Error:", error.message);
                return res.status(error.status || 500).json({ error: error.message });
            }
        }
    }
});

// 4. DATABASE & SERVER START
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Database Connected");
        app.listen(PORT, () => console.log(`🚀 Server active: http://localhost:${PORT}`));
    })
    .catch(err => console.error("❌ DB Connection Failed:", err));