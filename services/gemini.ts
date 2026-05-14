import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScoutReport = async (playerName: string, stats: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional tennis scout. Write a brief, high-energy 3-sentence scouting report for a player named ${playerName} with the following stats: ${stats}. Focus on their potential and playing style.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating scout report:", error);
    return "Analysis unavailable at this moment.";
  }
};

export const predictMatchWinner = async (matchDetails: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this tennis match matchup and predict a winner with a brief reason. Keep it under 50 words. Match: ${matchDetails}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error predicting match:", error);
    return "Prediction unavailable.";
  }
};