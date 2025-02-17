import { GoogleGenerativeAI } from "@google/generative-ai";
require('dotenv').config();

const apiKey = process.env.API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);

async function ask(query) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([`${query}`]);
        // console.log(result.response.text());
        return result.response.text();
    } catch (error) {
        console.error("Error:", error);
    }
}

// query = "what time now?"
// ask(query);

export { ask };