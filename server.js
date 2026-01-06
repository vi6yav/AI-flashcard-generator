// server.js

// --- 1. SETUP AND IMPORTS ---
require('dotenv').config(); // Loads variables from .env
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3000;
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
const MONGO_URI = process.env.MONGO_URI;

// Middleware to parse incoming JSON data and serve static files
app.use(express.json());
app.use(express.static('public')); // This tells Express to look in the 'public' folder for index.html
// server.js (add this line below the existing app.use lines)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
// --- 2. MONGODB SCHEMA ---
// Defines the structure of the data we will save
const FlashcardSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    source_topic: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});
const Flashcard = mongoose.model('Flashcard', FlashcardSchema);

// --- 3. API ROUTE: GENERATE AND SAVE FLASHCARDS (POST) ---
app.post('/generate', async (req, res) => {
    // Get data from the frontend form submission
    const { topicName, sourceText } = req.body;

    if (!topicName || !sourceText) {
        return res.status(400).json({ error: 'Topic Name and Source Text are required.' });
    }

    // Structured prompt for Gemini (forcing JSON output for clean database saving)
    const prompt = `You are a professional study guide creator. Your task is to analyze the following text and generate 10 distinct Question and Answer flashcards in JSON format. The entire response MUST be a single JSON array of objects, where each object has only two keys: "question" and "answer". Do not include any other text or explanation. \n\nTOPIC: ${topicName}\n\nTEXT TO ANALYZE:\n${sourceText}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: { question: { type: "string" }, answer: { type: "string" } },
                        required: ["question", "answer"]
                    }
                }
            }
        });

        const flashcardData = JSON.parse(response.text);

        // Map the generated data to include the source topic and save to MongoDB
        const documentsToSave = flashcardData.map(card => ({
            ...card,
            source_topic: topicName
        }));

        const savedCards = await Flashcard.insertMany(documentsToSave);
        console.log(`Successfully saved ${savedCards.length} flashcards for topic: ${topicName}`);

        res.json({ message: 'Flashcards generated and saved successfully!', count: savedCards.length });

    } catch (error) {
        console.error("Error generating or saving flashcards:", error);
        res.status(500).json({ error: 'Failed to generate flashcards. Check server logs.' });
    }
});

// --- 4. API ROUTE: GET ALL FLASHCARDS (GET) ---
app.get('/flashcards', async (req, res) => {
    try {
        // Find all flashcards and sort by the most recently created
        const allCards = await Flashcard.find().sort({ created_at: -1 });
        res.json(allCards);
    } catch (error) {
        console.error("Error retrieving flashcards:", error);
        res.status(500).json({ error: 'Failed to retrieve flashcards.' });
    }
});

// --- 5. START SERVER AND CONNECT TO DB ---
async function startServer() {
    try {
        // Connects to your MongoDB Atlas cluster using the URI from the .env file
        await mongoose.connect(MONGO_URI);
        console.log("Database connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to database or start server. Check MONGO_URI:", error);
        process.exit(1);
    }
}

startServer();