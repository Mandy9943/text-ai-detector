import axios, { AxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    console.log("Analyze API route called");
    const body = await request.json();
    const { text } = body;

    console.log(`Received text of length: ${text?.length || 0}`);

    if (!text) {
      console.log("No text provided");
      return NextResponse.json(
        { error: "Please enter some text to analyze" },
        { status: 400 }
      );
    }

    console.log("Calling Winston API");
    const response = await axios.post<AiContentDetectionResponse>(
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

    console.log("Winston API response received");
    return NextResponse.json({ data: response.data });
  } catch (error: unknown) {
    console.error("Error analyzing text:", error);

    if (error instanceof AxiosError && error.response?.data) {
      console.error("Winston API error:", error.response.data);
      return NextResponse.json(
        {
          error:
            error.response.data.description ||
            "An error occurred while analyzing the text",
        },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
