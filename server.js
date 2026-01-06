// server.js
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. SETUP: Unified Client for 2026
// Make sure GEMINI_API_KEY and MONGO_URI are in your .env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(express.static('public')); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. MONGODB SCHEMA
const FlashcardSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    source_topic: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});
const Flashcard = mongoose.model('Flashcard', FlashcardSchema);

// 3. API ROUTE: GENERATE (POST)
app.post('/generate', async (req, res) => {
    const { topicName, sourceText } = req.body;

    if (!topicName || !sourceText) {
        return res.status(400).json({ error: 'Topic and Text are required.' });
    }

    const prompt = `You are a professional study guide creator. Generate 10 Question and Answer flashcards in JSON format for the topic: ${topicName}. 
    Use this text: ${sourceText}. 
    Return ONLY a JSON array of objects with "question" and "answer" keys.`;
    
    try {
        // Use the fast, stable 2.0-flash model
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', 
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        // The SDK returns text as a property
        const flashcardData = JSON.parse(response.text);

        const documentsToSave = flashcardData.map(card => ({
            ...card,
            source_topic: topicName
        }));

        const savedCards = await Flashcard.insertMany(documentsToSave);
        console.log(`✅ Saved ${savedCards.length} cards for: ${topicName}`);

        res.json({ message: 'Flashcards saved successfully!', count: savedCards.length });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: 'Failed to generate flashcards. Check console.' });
    }
});

// 4. API ROUTE: GET ALL (GET)
app.get('/flashcards', async (req, res) => {
    try {
        const allCards = await Flashcard.find().sort({ created_at: -1 });
        res.json(allCards);
    } catch (error) {
        res.status(500).json({ error: 'Database retrieval failed.' });
    }
});

// 5. START SERVER
async function startServer() {
    try {
        if (!MONGO_URI) throw new Error("Missing MONGO_URI in .env file");
        
        await mongoose.connect(MONGO_URI);
        console.log("✅ Database Connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Startup Error:", error.message);
        process.exit(1);
    }
}

startServer();