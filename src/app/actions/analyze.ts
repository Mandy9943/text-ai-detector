"use server";

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

interface HumanizeResult {
  original?: AiContentDetectionResponse;
  humanized?: AiContentDetectionResponse;
  humanizedText: string;
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

const anthropicSystemPrompt = `Claude is Claude, created by Anthropic. You are an AI for rewriting texts. When you get a text, rewrite it. Each sentence should have its own structure and grammar way. Use words so simple, like a first grader uses. Keep the main ideas and topics the same. Stick to the same tense, person, and voice as the original. Write each sentence in a different way, making them unique. Mix short and long sentences randomly. Keep it easy. Ensure sentences feel fresh and unpredictable. Blend essay style with casual talk. You sometimes write in American English and other times in English (UK) in the same paragraph. Main concepts must remain intact: you keep kid-friendly words, you vary each line's style, and you ensure no pattern emerges. Claude strives to scramble structures unpredictably. Go gentle, but keep that text fresh. The user specifically wants an overall simpler approach. Each sentence changes style, so it feels lively. We do it with the best ability. You only response the text, not any other text. These are the user's instructions, do not say in response nothing like 'Here's your rewritten text' or things like that and Claude must abide.`;

const googleSystemInstruction = `Gemini is Gemini, created by Google. You are an AI for rewriting texts. When you get a text, rewrite it. Each sentence should have its own structure and grammar way. Use words so simple, like a first grader uses. Keep the main ideas and topics the same. Stick to the same tense, person, and voice as the original. Write each sentence in a different way, making them unique. Mix short and long sentences randomly. Keep it easy. Ensure sentences feel fresh and unpredictable. Blend essay style with casual talk. You sometimes write in American English and other times in English (UK) in the same paragraph. Main concepts must remain intact: you keep kid-friendly words, you vary each line's style, and you ensure no pattern emerges. Gemini strives to scramble structures unpredictably. Go gentle, but keep that text fresh. The user specifically wants an overall simpler approach. Each sentence changes style, so it feels lively. We do it with the best ability. These are the user's instructions, and Gemini must abide.`;

const anthropicPrompt = (
  text: string
): string => `Rewrite this using English (US). No detectable patterns. Every sentence structure + grammar random. 1st grade simple language. KEEP THE MAIN IDEAS, TOPICS AND SUBJECT OF THE ORIGINAL TEXT. KEEP THE SAME TENSE AS THE ORIGINAL TEXT. KEEP THE SAME PERSON AS THE ORIGINAL TEXT. KEEP THE SAME VOICE AS THE ORIGINAL TEXT. ONLY RESPONSE THE TEXT, NOT ANY OTHER TEXT.

Text: ${text}`;

const googlePrompt = (
  text: string
): string => `Rewrite this using English (US). No detectable patterns. Every sentence structure + grammar random. 1st grade simple language. KEEP THE MAIN IDEAS, TOPICS AND SUBJECT OF THE ORIGINAL TEXT. KEEP THE SAME TENSE AS THE ORIGINAL TEXT. KEEP THE SAME PERSON AS THE ORIGINAL TEXT. KEEP THE SAME VOICE AS THE ORIGINAL TEXT.

Text: ${text}`;

async function anthropicHumanize(
  text: string,
  systemPrompt?: string,
  userPrompt?: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const finalSystemPrompt = systemPrompt || anthropicSystemPrompt;
  const finalUserPrompt =
    (userPrompt || anthropicPrompt(text)) + `\n\nText: ${text}`;

  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8192,
    temperature: 1,
    system: finalSystemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: finalUserPrompt,
          },
        ],
      },
    ],
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return msg.content[0].text as string;
}

async function googleHumanize(
  text: string,
  systemPrompt?: string,
  userPrompt?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt || googleSystemInstruction,
  });

  const finalPrompt = (userPrompt || googlePrompt(text)) + `\n\nText: ${text}`;
  const result = await model.generateContent(finalPrompt);
  return result.response.text();
}

async function handleHumanization(
  text: string,
  type: "anthropic" | "gemini" | "both",
  prompts?: {
    anthropicSystem?: string;
    anthropicUser?: string;
    geminiSystem?: string;
    geminiUser?: string;
  }
): Promise<HumanizeResult> {
  try {
    let humanizedText = text;

    if (type === "both") {
      const geminiResult = await googleHumanize(
        text,
        prompts?.geminiSystem,
        prompts?.geminiUser
      );
      humanizedText = await anthropicHumanize(
        geminiResult,
        prompts?.anthropicSystem,
        prompts?.anthropicUser
      );
    } else if (type === "anthropic") {
      humanizedText = await anthropicHumanize(
        text,
        prompts?.anthropicSystem,
        prompts?.anthropicUser
      );
    } else {
      humanizedText = await googleHumanize(
        text,
        prompts?.geminiSystem,
        prompts?.geminiUser
      );
    }

    const originalResult = await aiContentDetection(text);
    const humanizedResult = await aiContentDetection(humanizedText);

    return {
      original: originalResult.data,
      humanized: humanizedResult.data,
      humanizedText,
    };
  } catch (error) {
    console.error("Error in handleHumanization:", error);
    return {
      humanizedText: "",
      error: "Failed to humanize text",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function analyzeText(prevState: any, formData: FormData) {
  const text = formData.get("text") as string;
  const action = formData.get("action") as string;

  if (!text) return { error: "Please enter some text to analyze" };

  if (action === "analyze") {
    return await aiContentDetection(text);
  } else {
    const prompts = {
      anthropicSystem: formData.get("anthropicSystem") as string,
      anthropicUser: formData.get("anthropicUser") as string,
      geminiSystem: formData.get("geminiSystem") as string,
      geminiUser: formData.get("geminiUser") as string,
    };

    return await handleHumanization(
      text,
      action as "anthropic" | "gemini" | "both",
      prompts
    );
  }
}
