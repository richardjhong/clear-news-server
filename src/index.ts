import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secret_name = "clear-news-server-environmentVariables";

const client = new SecretsManagerClient({
  region: "us-east-2",
});

let response;

async function getSecretValue(client: any, secret_name: string) {
  try {
    return await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      })
    );
  } catch (error) {
    // For a list of exceptions thrown, see:
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
  }
}

(async () => {
  try {
    const response = await getSecretValue(client, secret_name);
    console.log(response);
  } catch (error) {
    console.error("Error fetching secret:", error);
  }
})();

// Your code goes here

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
