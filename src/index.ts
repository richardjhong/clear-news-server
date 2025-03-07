import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const PROD_ENV = process.env.NODE_ENV === "development";

const getApiKey = async () => {
  if (PROD_ENV) {
    const localApiKey = process.env.PERPLEXITY_API_KEY;
    if (!localApiKey) throw new Error("LOCAL API KEY NOT FOUND");
    console.log("using local env api key");
    return localApiKey;
  }

  const secret_name = "clear-news-server-environmentVariables";
  const client = new SecretsManagerClient({
    region: "us-east-2",
  });

  const getSecretValue = async (client: any, secret_name: string) => {
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
  };

  const { SecretString } = await getSecretValue(client, secret_name);
  const parsedSecretString = JSON.parse(SecretString);

  console.log("using aws secrets env key");
  return parsedSecretString.PERPLEXITY_API_KEY;
};

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

const initializeApp = async () => {
  try {
    const api_key = await getApiKey();
    app.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    app.post("/api/analyze", async (req, res) => {
      const { input } = req.body;
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
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
  } catch (error) {
    console.error("Failed to initialize app:", error);
    process.exit(1);
  }
};

initializeApp().catch((error) => {
  console.error("Fatal error during app initialization:", error);
  process.exit(1);
});
