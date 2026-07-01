import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake' });
(async () => {
    try {
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { text: "test" },
              { inlineData: { data: "fake", mimeType: "image/png" } }
            ]
        });
    } catch(e) {
        console.log("CAUGHT:", e.message);
    }
})();
