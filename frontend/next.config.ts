import path from "node:path";
import process from "node:process";

import type { NextConfig } from "next";

// Le credenziali Langfuse vivono in un unico `.env` alla radice del repo, condiviso col backend
// Python (vedi CONTEXT.md) — non duplicato in un .env.local di questo progetto.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "..", ".env"));
} catch {
  // .env assente (es. in un ambiente dove le variabili sono già impostate altrove): si prosegue.
}

const nextConfig: NextConfig = { agentRules: false };

export default nextConfig;
