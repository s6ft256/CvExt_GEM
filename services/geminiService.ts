
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, JobRequirements } from "../types";

export const screenResume = async (
  resumeText: string,
  jobReqs: JobRequirements
): Promise<ExtractionResult> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please set it in your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Act as a professional HSE (Health, Safety, and Environment) Recruiter. 
      Analyze the following resume text and extract key details strictly as requested.

      Target Certifications:
      - NEBOSH: Look for "NEBOSH IGC", "NEBOSH NGC", or "NEBOSH".
      - ADOSH/OSHAD: Look for "ADOSH", "OSHAD", or "Abu Dhabi Occupational Safety and Health".
      - LEVEL 6: Look specifically for "NVQ Level 6", "OTHM Level 6", or "NEBOSH International Diploma" (IDip).

      Nature of Experience:
      - Look for mentions of: Rail, Infrastructure, Bridges, Villa, Building, Offshore, Onshore, Facility Management.

      Resume Text:
      ${resumeText}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          yearsOfExperience: { type: Type.NUMBER, description: "Total numeric years of experience" },
          highestDegree: { type: Type.STRING },
          hasNebosh: { type: Type.BOOLEAN },
          hasLevel6: { type: Type.BOOLEAN, description: "True ONLY if they have NVQ Level 6, OTHM 6, or NEBOSH Diploma" },
          hasAdosh: { type: Type.BOOLEAN },
          natureOfExperienceFound: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["fullName", "email", "yearsOfExperience", "hasNebosh", "hasLevel6", "hasAdosh"]
      }
    }
  });

  try {
    let text = response.text.trim();
    // Remove potential markdown code blocks if the model includes them
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '').replace(/```$/, '');
    }
    const result = JSON.parse(text);
    return result as ExtractionResult;
  } catch (e) {
    console.error("Failed to parse AI response:", response.text);
    throw new Error("The AI provided an invalid data format. Please try again.");
  }
};
