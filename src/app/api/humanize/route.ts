import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

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

async function aiContentDetection(text: string) {
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
  return response.data;
}

async function anthropicHumanize(
  text: string,
  systemPrompt?: string,
  userPrompt?: string
) {
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
  return msg.content[0].text;
}

async function googleHumanize(
  text: string,
  systemPrompt?: string,
  userPrompt?: string
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt || googleSystemInstruction,
  });

  const finalPrompt = (userPrompt || googlePrompt(text)) + `\n\nText: ${text}`;
  const result = await model.generateContent(finalPrompt);
  return result.response.text();
}

export async function POST(request: NextRequest) {
  try {
    const { text, type, prompts } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Please enter some text to analyze" },
        { status: 400 }
      );
    }

    let humanizedText = text;
    const finalPrompts = { ...prompts };

    if (type === "both") {
      const finalGeminiPrompt =
        (prompts?.geminiUser || googlePrompt(text)) + `\n\nText: ${text}`;
      const geminiResult = await googleHumanize(
        text,
        prompts?.geminiSystem,
        prompts?.geminiUser
      );
      const finalAnthropicPrompt =
        (prompts?.anthropicUser || anthropicPrompt(geminiResult)) +
        `\n\nText: ${geminiResult}`;
      humanizedText = await anthropicHumanize(
        geminiResult,
        prompts?.anthropicSystem,
        prompts?.anthropicUser
      );
      finalPrompts.finalGeminiPrompt = finalGeminiPrompt;
      finalPrompts.finalAnthropicPrompt = finalAnthropicPrompt;
    } else if (type === "anthropic") {
      const finalAnthropicPrompt =
        (prompts?.anthropicUser || anthropicPrompt(text)) + `\n\nText: ${text}`;
      humanizedText = await anthropicHumanize(
        text,
        prompts?.anthropicSystem,
        prompts?.anthropicUser
      );
      finalPrompts.finalAnthropicPrompt = finalAnthropicPrompt;
    } else {
      const finalGeminiPrompt =
        (prompts?.geminiUser || googlePrompt(text)) + `\n\nText: ${text}`;
      humanizedText = await googleHumanize(
        text,
        prompts?.geminiSystem,
        prompts?.geminiUser
      );
      finalPrompts.finalGeminiPrompt = finalGeminiPrompt;
    }

    const originalResult = await aiContentDetection(text);
    const humanizedResult = await aiContentDetection(humanizedText);

    return NextResponse.json({
      original: originalResult,
      humanized: humanizedResult,
      humanizedText,
      prompts: finalPrompts,
      type,
    });
  } catch (error: unknown) {
    console.error("Error humanizing text:", error);
    return NextResponse.json(
      { error: "Failed to humanize text", humanizedText: "" },
      { status: 500 }
    );
  }
}
