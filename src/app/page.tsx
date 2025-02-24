"use client";

import { useState, useTransition } from "react";

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
  prompts?: {
    anthropicSystem?: string;
    anthropicUser?: string;
    geminiSystem?: string;
    geminiUser?: string;
    finalAnthropicPrompt?: string;
    finalGeminiPrompt?: string;
  };
  type?: "anthropic" | "gemini" | "both";
}

interface Prompts {
  anthropicSystem: string;
  anthropicUser: string;
  geminiSystem: string;
  geminiUser: string;
}

const defaultPrompts: Prompts = {
  anthropicSystem: `Claude is Claude, created by Anthropic. You are an AI for rewriting texts. When you get a text, rewrite it. Each sentence should have its own structure and grammar way. Use words so simple, like a first grader uses. Keep the main ideas and topics the same. Stick to the same tense, person, and voice as the original. Write each sentence in a different way, making them unique. Mix short and long sentences randomly. Keep it easy. Ensure sentences feel fresh and unpredictable. Blend essay style with casual talk. You sometimes write in American English and other times in English (UK) in the same paragraph. Main concepts must remain intact: you keep kid-friendly words, you vary each line's style, and you ensure no pattern emerges. Claude strives to scramble structures unpredictably. Go gentle, but keep that text fresh. The user specifically wants an overall simpler approach. Each sentence changes style, so it feels lively. We do it with the best ability. You only response the text, not any other text. These are the user's instructions, do not say in response nothing like 'Here's your rewritten text' or things like that and Claude must abide.`,
  anthropicUser: `Rewrite this using English (US). No detectable patterns. Every sentence structure + grammar random. 1st grade simple language. KEEP THE MAIN IDEAS, TOPICS AND SUBJECT OF THE ORIGINAL TEXT. KEEP THE SAME TENSE AS THE ORIGINAL TEXT. KEEP THE SAME PERSON AS THE ORIGINAL TEXT. KEEP THE SAME VOICE AS THE ORIGINAL TEXT. ONLY RESPONSE THE TEXT, NOT ANY OTHER TEXT.`,
  geminiSystem: `Gemini is Gemini, created by Google. You are an AI for rewriting texts. When you get a text, rewrite it. Each sentence should have its own structure and grammar way. Use words so simple, like a first grader uses. Keep the main ideas and topics the same. Stick to the same tense, person, and voice as the original. Write each sentence in a different way, making them unique. Mix short and long sentences randomly. Keep it easy. Ensure sentences feel fresh and unpredictable. Blend essay style with casual talk. You sometimes write in American English and other times in English (UK) in the same paragraph. Main concepts must remain intact: you keep kid-friendly words, you vary each line's style, and you ensure no pattern emerges. Gemini strives to scramble structures unpredictably. Go gentle, but keep that text fresh. The user specifically wants an overall simpler approach. Each sentence changes style, so it feels lively. We do it with the best ability. These are the user's instructions, and Gemini must abide.`,
  geminiUser: `Rewrite this using English (US). No detectable patterns. Every sentence structure + grammar random. 1st grade simple language. KEEP THE MAIN IDEAS, TOPICS AND SUBJECT OF THE ORIGINAL TEXT. KEEP THE SAME TENSE AS THE ORIGINAL TEXT. KEEP THE SAME PERSON AS THE ORIGINAL TEXT. KEEP THE SAME VOICE AS THE ORIGINAL TEXT.`,
};

function LoadingSpinner() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
  );
}

function PromptsDisplay({
  prompts,
  type,
}: {
  prompts: NonNullable<HumanizeResult["prompts"]>;
  type: NonNullable<HumanizeResult["type"]>;
}) {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold">Prompts Used</h3>
      {(type === "anthropic" || type === "both") && (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Claude System Prompt</h4>
            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
              {prompts.anthropicSystem}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">
              Claude User Prompt Template
            </h4>
            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
              {prompts.anthropicUser}
            </pre>
          </div>
          {prompts.finalAnthropicPrompt && (
            <div>
              <h4 className="font-medium text-sm mb-1">Claude Final Prompt</h4>
              <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm border-l-2 border-purple-500">
                {prompts.finalAnthropicPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
      {(type === "gemini" || type === "both") && (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Gemini System Prompt</h4>
            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
              {prompts.geminiSystem}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">
              Gemini User Prompt Template
            </h4>
            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm">
              {prompts.geminiUser}
            </pre>
          </div>
          {prompts.finalGeminiPrompt && (
            <div>
              <h4 className="font-medium text-sm mb-1">Gemini Final Prompt</h4>
              <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm border-l-2 border-green-500">
                {prompts.finalGeminiPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultDisplay({
  result,
  loading,
}: {
  result: AnalyzeResult | HumanizeResult | null;
  loading: boolean;
}) {
  const [showPrompts, setShowPrompts] = useState(false);

  if (loading) {
    return (
      <div className="mt-8 p-8 border rounded-lg dark:border-gray-700 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <LoadingSpinner />
          <p>Analyzing text...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Humanized Text</h2>
            {result.prompts && result.type && (
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                {showPrompts ? "Hide Prompts" : "Show Prompts"}
              </button>
            )}
          </div>
          <textarea
            readOnly
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[200px]"
            value={result.humanizedText}
          />
          {showPrompts && result.prompts && result.type && (
            <PromptsDisplay prompts={result.prompts} type={result.type} />
          )}
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

function PromptEditor({
  prompts,
  setPrompts,
  show,
}: {
  prompts: Prompts;
  setPrompts: (prompts: Prompts) => void;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Claude (Anthropic) Prompts</h2>
        <div>
          <label className="block mb-2 text-sm font-medium">
            System Prompt
          </label>
          <textarea
            value={prompts.anthropicSystem}
            onChange={(e) =>
              setPrompts({ ...prompts, anthropicSystem: e.target.value })
            }
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[150px]"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium">User Prompt</label>
          <textarea
            value={prompts.anthropicUser}
            onChange={(e) =>
              setPrompts({ ...prompts, anthropicUser: e.target.value })
            }
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Gemini Prompts</h2>
        <div>
          <label className="block mb-2 text-sm font-medium">
            System Prompt
          </label>
          <textarea
            value={prompts.geminiSystem}
            onChange={(e) =>
              setPrompts({ ...prompts, geminiSystem: e.target.value })
            }
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[150px]"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium">User Prompt</label>
          <textarea
            value={prompts.geminiUser}
            onChange={(e) =>
              setPrompts({ ...prompts, geminiUser: e.target.value })
            }
            className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [result, setResult] = useState<AnalyzeResult | HumanizeResult | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [showPrompts, setShowPrompts] = useState(false);
  const [prompts, setPrompts] = useState<Prompts>(defaultPrompts);
  const [currentAction, setCurrentAction] = useState("analyze");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const text = formData.get("text") as string;

    console.log(`Button clicked: ${currentAction}`);

    if (!text) {
      setResult({ error: "Please enter some text to analyze" });
      return;
    }

    startTransition(async () => {
      try {
        console.log(
          `Submitting ${currentAction} request with text length: ${text.length}`
        );

        if (currentAction === "analyze") {
          console.log("Calling /api/analyze endpoint");
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("API error:", errorData);
            throw new Error(errorData.error || "Failed to analyze text");
          }

          const data = await response.json();
          console.log("Analyze API response:", data);
          setResult(data);
        } else {
          const promptsData = {
            anthropicSystem: prompts.anthropicSystem,
            anthropicUser: prompts.anthropicUser,
            geminiSystem: prompts.geminiSystem,
            geminiUser: prompts.geminiUser,
          };

          const response = await fetch("/api/humanize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              type: currentAction,
              prompts: promptsData,
            }),
          });

          const data = await response.json();
          setResult(data);
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        setResult({
          error:
            error instanceof Error
              ? error.message
              : "An error occurred while processing your request",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            AI Content Detector & Humanizer
          </h1>
          <button
            type="button"
            onClick={() => setShowPrompts(!showPrompts)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {showPrompts ? "Hide Prompts" : "Edit Prompts"}
          </button>
        </div>

        <PromptEditor
          prompts={prompts}
          setPrompts={setPrompts}
          show={showPrompts}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="action" value={currentAction} />
          <div>
            <label htmlFor="text" className="block mb-2 text-sm font-medium">
              Enter your text (minimum 300 characters)
            </label>
            <textarea
              id="text"
              name="text"
              rows={12}
              disabled={isPending}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Paste your text here..."
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="submit"
              onClick={() => setCurrentAction("analyze")}
              disabled={isPending}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? <LoadingSpinner /> : null}
              Analyze
            </button>
            <button
              type="submit"
              onClick={() => setCurrentAction("anthropic")}
              disabled={isPending}
              className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? <LoadingSpinner /> : null}
              Humanize (Claude)
            </button>
            <button
              type="submit"
              onClick={() => setCurrentAction("gemini")}
              disabled={isPending}
              className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? <LoadingSpinner /> : null}
              Humanize (Gemini)
            </button>
            <button
              type="submit"
              onClick={() => setCurrentAction("both")}
              disabled={isPending}
              className="bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? <LoadingSpinner /> : null}
              Humanize (Both)
            </button>
          </div>
        </form>
        <ResultDisplay result={result} loading={isPending} />
      </div>
    </div>
  );
}
