"use client";

import { useMemo, useState } from "react";
import axios from "axios";

type DetectionResult = {
  score: number;
  verdict: string;
  raw?: any;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("Ready for analysis");

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const isImage = file?.type.startsWith("image/");
  const isVideo = file?.type.startsWith("video/");

  const verdictStyles = useMemo(() => {
    if (!result) {
      return {
        badge: "bg-zinc-800 text-zinc-200 border-zinc-700",
        bar: "bg-zinc-500",
      };
    }

    const verdict = result.verdict.toLowerCase();

    if (verdict.includes("ai")) {
      return {
        badge: "bg-red-950/60 text-red-300 border-red-800",
        bar: "bg-red-500",
      };
    }

    if (verdict.includes("unclear")) {
      return {
        badge: "bg-yellow-950/60 text-yellow-300 border-yellow-800",
        bar: "bg-yellow-500",
      };
    }

    return {
      badge: "bg-green-950/60 text-green-300 border-green-800",
      bar: "bg-green-500",
    };
  }, [result]);

  const recommendation = useMemo(() => {
    if (!result) return "Upload a file to receive a detection result.";

    if (result.score >= 80) {
      return "This file shows strong signs of AI generation. Treat it cautiously and verify the source before trusting it.";
    }

    if (result.score >= 50) {
      return "This result is inconclusive. Use additional context, source checks, and reverse-search methods before deciding.";
    }

    return "This file appears more likely to be authentic, but no detector is perfect. Always verify important content.";
  }, [result]);

  const friendlyError = (message: string) => {
    const lower = message.toLowerCase();

    if (lower.includes("simultaneous video streams")) {
      return "Video analysis is currently limited by your API plan. Images should still work normally.";
    }

    if (lower.includes("incorrect api user or api secret")) {
      return "Your API credentials appear to be incorrect. Check your backend .env file and restart the server.";
    }

    if (lower.includes("no file uploaded")) {
      return "No file was received by the server. Try selecting the file again.";
    }

    if (lower.includes("analysis failed")) {
      return "The analysis service could not process this file right now. Please try again.";
    }

    return message;
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a file first.");
      setStatusText("Waiting for file");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setStatusText("Uploading and analyzing...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("http://127.0.0.1:5000/analyze", formData);

      setResult({
        score: response.data.score,
        verdict: response.data.verdict,
        raw: response.data.raw,
      });

      setStatusText("Analysis complete");
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.details?.error?.message ||
        err?.response?.data?.error ||
        "Upload failed. Please try again.";

      setError(friendlyError(backendMessage));
      setStatusText("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setError("");
    setStatusText("Ready for analysis");
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs tracking-wide text-zinc-300">
            AI media authenticity checker
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI Video/Image Detector
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Upload an image or short video and get a quick AI-likelihood verdict.
            Image analysis is the most reliable mode in the current build.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Current status</p>
            <p className="mt-2 font-semibold">{statusText}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Best supported</p>
            <p className="mt-2 font-semibold">JPG, PNG, WEBP images</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Video support</p>
            <p className="mt-2 font-semibold">Plan-dependent</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Upload media</h2>
              {file && (
                <button
                  onClick={handleClear}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <label className="mb-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/70 p-6 text-center transition hover:border-zinc-500 hover:bg-zinc-900">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  setFile(selected);
                  setResult(null);
                  setError("");
                  setStatusText(selected ? "File selected" : "Ready for analysis");
                }}
                className="hidden"
              />

              <div className="space-y-2">
                <p className="text-base font-medium">
                  {file ? "Change selected file" : "Choose an image or video"}
                </p>
                <p className="text-sm text-zinc-400">
                  Images are fully supported. Video support depends on API plan limits.
                </p>
              </div>
            </label>

            {file && (
              <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "Unknown type"}
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full rounded-2xl border border-zinc-700 bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Upload and Analyze"}
            </button>

            {loading && (
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Checking media for AI-generated patterns...
                </p>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/40 p-4">
                <p className="text-sm font-medium text-red-300">Analysis issue</p>
                <p className="mt-1 text-sm text-red-200">{error}</p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-semibold">Analysis</h2>

            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <div className="flex min-h-[260px] items-center justify-center p-4">
                {!file && (
                  <p className="text-sm text-zinc-500">
                    Your media preview will appear here.
                  </p>
                )}

                {file && isImage && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[320px] rounded-xl object-contain"
                  />
                )}

                {file && isVideo && previewUrl && (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-[320px] rounded-xl"
                  />
                )}
              </div>
            </div>

            {!result && !loading && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
                Upload a file to see an AI likelihood score, verdict, and confidence bar.
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Verdict</p>
                    <p className="mt-1 text-2xl font-bold">{result.verdict}</p>
                  </div>

                  <div
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${verdictStyles.badge}`}
                  >
                    {result.score}% AI likelihood
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Confidence meter</span>
                    <span className="font-medium">{result.score}%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${verdictStyles.bar}`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm text-zinc-400">Interpretation</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    {recommendation}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm text-zinc-400">File type</p>
                    <p className="mt-1 font-medium">{file?.type || "Unknown"}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm text-zinc-400">Scan mode</p>
                    <p className="mt-1 font-medium">
                      {isVideo ? "Video analysis" : "Image analysis"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
          <h3 className="text-lg font-semibold">About this detector</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            This app provides a probability-based estimate using third-party AI media
            detection. Results are helpful for triage, but they should not be treated
            as absolute proof. For important content, combine this result with source
            verification and context checks.
          </p>
        </div>
      </div>
    </main>
  );
}