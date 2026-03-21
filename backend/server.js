require("dotenv").config();

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

function cleanupFile(path) {
  try {
    if (path && fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  } catch (err) {
    console.error("Failed to delete temp file:", err.message);
  }
}

function getVerdict(score) {
  if (score >= 80) return "Likely AI-generated";
  if (score >= 50) return "Needs more verification";
  return "Likely authentic";
}

function getRecommendation(score) {
  if (score >= 80) {
    return "This file shows strong signs of AI generation. Verify the source before trusting it.";
  }
  if (score >= 50) {
    return "This result is inconclusive. Use other checks before making a decision.";
  }
  return "This file appears more likely to be authentic, but no detector is perfect.";
}

function getFriendlyApiError(details) {
  const raw =
    details?.error?.message ||
    details?.error ||
    details?.message ||
    "Unknown error";

  const lower = String(raw).toLowerCase();

  if (lower.includes("incorrect api user or api secret")) {
    return "API credentials are invalid. Check your backend environment variables.";
  }

  if (lower.includes("simultaneous video streams")) {
    return "Video analysis is temporarily unavailable for your current API plan.";
  }

  if (lower.includes("file too large")) {
    return "This file is too large to analyze.";
  }

  if (lower.includes("unsupported")) {
    return "This file type is not supported.";
  }

  if (lower.includes("timeout")) {
    return "The analysis took too long. Please try again.";
  }

  return String(raw);
}

function extractAiScore(data, isVideo) {
  if (!data || typeof data !== "object") return 0;

  // Image response shape
  if (!isVideo && typeof data?.type?.ai_generated === "number") {
    return Math.round(data.type.ai_generated * 100);
  }

  // Some APIs may still return this shape for video
  if (typeof data?.type?.ai_generated === "number") {
    return Math.round(data.type.ai_generated * 100);
  }

  // Fallbacks for possible alternative response structures
  if (typeof data?.ai_generated === "number") {
    return Math.round(data.ai_generated * 100);
  }

  if (typeof data?.score === "number") {
    return Math.round(data.score * 100);
  }

  return 0;
}

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    hasApiUser: Boolean(process.env.API_USER),
    hasApiSecret: Boolean(process.env.API_SECRET),
  });
});

app.post("/analyze", upload.single("file"), async (req, res) => {
  let filePath;

  try {
    if (!process.env.API_USER || !process.env.API_SECRET) {
      return res.status(500).json({
        error: "Missing API credentials",
        friendlyMessage:
          "Backend API credentials are missing. Check your .env file.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
        friendlyMessage: "Please choose a file before uploading.",
      });
    }

    filePath = req.file.path;

    const mimeType = req.file.mimetype || "";
    const isVideo = mimeType.startsWith("video/");
    const isImage = mimeType.startsWith("image/");

    if (!isImage && !isVideo) {
      cleanupFile(filePath);
      return res.status(400).json({
        error: "Unsupported file type",
        friendlyMessage: "Please upload an image or video file.",
      });
    }

    const form = new FormData();
    form.append("media", fs.createReadStream(filePath));
    form.append("models", "genai");
    form.append("api_user", process.env.API_USER);
    form.append("api_secret", process.env.API_SECRET);

    const endpoint = isVideo
      ? "https://api.sightengine.com/1.0/video/check-sync.json"
      : "https://api.sightengine.com/1.0/check.json";

    const response = await axios.post(endpoint, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 60000,
    });

    const aiScore = extractAiScore(response.data, isVideo);
    const verdict = getVerdict(aiScore);
    const recommendation = getRecommendation(aiScore);

    cleanupFile(filePath);

    return res.json({
      success: true,
      score: aiScore,
      verdict,
      recommendation,
      mediaType: isVideo ? "video" : "image",
      raw: response.data,
    });
  } catch (error) {
    cleanupFile(filePath || req.file?.path);

    const details = error.response?.data || { message: error.message };
    const friendlyMessage = getFriendlyApiError(details);

    console.error("ANALYSIS ERROR:", details);

    return res.status(500).json({
      error: "Analysis failed",
      friendlyMessage,
      details,
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "Upload error",
      friendlyMessage:
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Please upload a file under 25 MB."
          : "There was a problem uploading your file.",
    });
  }

  console.error("SERVER ERROR:", err);

  return res.status(500).json({
    error: "Server error",
    friendlyMessage: "Something went wrong on the server.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});