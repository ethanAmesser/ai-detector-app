"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { score: number; verdict: string }>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("http://localhost:5000/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult({
        score: response.data.score,
        verdict: response.data.verdict,
      });
    } catch (err) {
      setError("Upload failed. Make sure your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-center">AI Video/Image Detector</h1>

        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
          }}
          className="block w-full"
        />

        <button
          onClick={handleUpload}
          className="w-full rounded-xl border px-4 py-3 font-medium"
        >
          {loading ? "Analyzing..." : "Upload and Analyze"}
        </button>

        {error && <p className="text-center">{error}</p>}

        {result && (
          <div className="border rounded-xl p-6 space-y-2">
            <p className="text-xl font-semibold">{result.verdict}</p>
            <p>AI likelihood: {result.score}%</p>
          </div>
        )}
      </div>
    </main>
  );
}