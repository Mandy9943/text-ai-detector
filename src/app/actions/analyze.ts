"use server";

import axios, { AxiosError } from "axios";

interface AiContentDetectionResponse {
  status: number;
  length: number;
  score: number;
  sentences: {
    length: number;
    score: number;
    text: string;
  }[];
  readability_score: number;
  input: string;
  credits_used: number;
  credits_remaining: number;
  version: string;
  language: string;
}

interface ApiError {
  error: string;
  description: string;
}

interface AnalyzeResult {
  data?: AiContentDetectionResponse;
  error?: string;
}

async function aiContentDetection(text: string): Promise<AnalyzeResult> {
  try {
    const response = await axios.post(
      "https://api.gowinston.ai/v2/ai-content-detection",
      {
        text,
        version: "4.0",
        sentences: true,
        language: "en",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WINSTON_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return { data: response.data };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const apiError = error.response.data as ApiError;
      return {
        error:
          apiError.description || "An error occurred while analyzing the text",
      };
    }
    return { error: "An unexpected error occurred" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function analyzeText(prevState: any, formData: FormData) {
  const text = formData.get("text") as string;
  if (!text) return { error: "Please enter some text to analyze" };

  return await aiContentDetection(text);
}
