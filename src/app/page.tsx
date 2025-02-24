"use client";

import { useFormState } from "react-dom";
import { analyzeText } from "./actions/analyze";

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

function ResultDisplay({
  result,
}: {
  result: AnalyzeResult | HumanizeResult | null;
}) {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="mt-8 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10 dark:border-red-500/20">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  if ("humanizedText" in result) {
    return (
      <div className="mt-8 space-y-6">
        <div className="p-4 border rounded-lg dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Humanized Text</h2>
          <textarea
            readOnly
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[200px]"
            value={result.humanizedText}
          />
        </div>
        {result.original && result.humanized && (
          <div className="grid grid-cols-2 gap-4">
            <ScoreDisplay title="Original Text Score" data={result.original} />
            <ScoreDisplay
              title="Humanized Text Score"
              data={result.humanized}
            />
          </div>
        )}
      </div>
    );
  }

  if (!result.data) return null;

  const aiProbability = 100 - result.data.score;
  const getColorClass = (score: number) => {
    if (score < 30) return "text-red-600 dark:text-red-400";
    if (score < 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="mt-8 p-4 border rounded-lg dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
      <div className="space-y-2">
        <p className="py-2 px-4 bg-gray-50 dark:bg-gray-800/50 rounded">
          AI Probability:{" "}
          <span className={getColorClass(result.data.score)}>
            {aiProbability.toFixed(1)}%
          </span>
        </p>
        <p className="">
          Score: <span>{result.data.score.toFixed(1)}%</span>
        </p>
        <p>Text Length: {result.data.length} characters</p>
        <p>Readability Score: {result.data.readability_score.toFixed(2)}</p>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Sentence Analysis:</h3>
          {/* <div className="space-y-2">
            {result.data.sentences.map((sentence, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded"
              >
                <p className="text-sm">{sentence.text}</p>
                <p className="text-xs mt-1">
                  AI Probability:{" "}
                  <span className={getColorClass(sentence.score)}>
                    {(100 - sentence.score).toFixed(1)}%
                  </span>
                </p>
              </div>
            ))}
          </div> */}
        </div>
      </div>
    </div>
  );
}

function ScoreDisplay({
  title,
  data,
}: {
  title: string;
  data: AiContentDetectionResponse;
}) {
  const aiProbability = 100 - data.score;
  const getColorClass = (score: number) => {
    if (score < 30) return "text-red-600 dark:text-red-400";
    if (score < 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="p-4 border rounded-lg dark:border-gray-700">
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="py-2 px-4 bg-gray-50 dark:bg-gray-800/50 rounded">
        AI Probability:{" "}
        <span className={getColorClass(data.score)}>
          {aiProbability.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

export default function Home() {
  const [result, formAction] = useFormState(analyzeText, null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          AI Content Detector & Humanizer
        </h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="text" className="block mb-2 text-sm font-medium">
              Enter your text (minimum 300 characters)
            </label>
            <textarea
              id="text"
              name="text"
              rows={6}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
              placeholder="Paste your text here..."
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="submit"
              name="action"
              value="analyze"
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Analyze
            </button>
            <button
              type="submit"
              name="action"
              value="anthropic"
              className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Humanize (Claude)
            </button>
            <button
              type="submit"
              name="action"
              value="gemini"
              className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              Humanize (Gemini)
            </button>
            <button
              type="submit"
              name="action"
              value="both"
              className="bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Humanize (Both)
            </button>
          </div>
        </form>
        <ResultDisplay result={result} />
      </div>
    </div>
  );
}
