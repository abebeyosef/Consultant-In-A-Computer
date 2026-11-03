import { getModelConfig, isMockMode, liveAvailable } from "@/lib/brain/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getModelConfig();
  const mock = isMockMode(cfg) || !liveAvailable();
  return Response.json({
    mode: mock ? "mock" : "live",
    model: mock ? "mock-engine" : cfg.model,
    reason: cfg.mockForced ? "MOCK_MODE=1" : !cfg.apiKey ? "no MODEL_API_KEY" : !liveAvailable() ? "live model backing off after errors" : undefined,
    meetBot: process.env.ENABLE_MEET_BOT === "1",
  });
}
