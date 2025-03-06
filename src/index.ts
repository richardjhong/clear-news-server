import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

type PerplexityResponse = {
  choices: Array<{
    message: {
      content: string;
      role: "assistant";
    };
    index: number;
    finish_reason: string;
  }>;
  id: string;
  model: string;
  created: number;
};

app.use(cors());
app.use(express.json());

console.log("api?: ", process.env.PERPLEXITY_API_KEY);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/analyze", async (req, res) => {
  const { input } = req.body;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: input }],
    }),
  };

  try {
    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      options
    );
    const data = (await response.json()) as PerplexityResponse;
    res.json({ result: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
