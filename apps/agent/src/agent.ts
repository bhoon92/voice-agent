import "dotenv/config";
import { fileURLToPath } from "node:url";
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import { createLLM, DEFAULT_MODEL, isModelAvailable } from "./models.js";
import { persistMessage, flushConversation } from "./storage.js";

// 영어로 지시해 모델이 더 확실히 따르게 한다. 핵심은 "반드시 한글 문자로만, 로마자 금지".
const INSTRUCTIONS = `You are a warm, friendly Korean AI friend talking with a young child.

LANGUAGE RULE (most important):
- Reply ONLY in natural Korean written in Hangul characters (가-힣).
- NEVER romanize Korean. For example, write "안녕" NOT "annyeong", write "뭐 하고 놀까?" NOT "mwo hago nolkka?".
- Do not use Chinese characters, English words, emojis, or special symbols.

STYLE:
- Use short, easy, encouraging sentences — only one or two at a time.
- Give the child frequent turns to speak.
- Output only your final spoken reply in Korean. Do not output your reasoning or any inner monologue.`;

// `/no_think`는 Qwen 전용 토큰이라 다른 모델엔 의미 없는 잡음이 된다. Qwen일 때만 붙인다.
function buildInstructions(modelId: string): string {
  return modelId === "groq-qwen" ? `/no_think\n${INSTRUCTIONS}` : INSTRUCTIONS;
}

function parseJobMetadata(metadata: string | undefined): {
  model: string;
  conversationId?: string;
} {
  if (!metadata) return { model: DEFAULT_MODEL };
  try {
    const parsed = JSON.parse(metadata) as {
      model?: string;
      conversationId?: string;
    };
    const model =
      parsed.model && isModelAvailable(parsed.model)
        ? parsed.model
        : DEFAULT_MODEL;
    return { model, conversationId: parsed.conversationId };
  } catch {
    return { model: DEFAULT_MODEL };
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const { model: modelId, conversationId } = parseJobMetadata(
      ctx.job.metadata,
    );
    const llm = createLLM(modelId);

    const session = new voice.AgentSession({
      stt: openai.STT.withGroq({
        model: "whisper-large-v3-turbo",
        language: "ko",
      }),
      llm,
      tts: new elevenlabs.TTS({
        apiKey: process.env.ELEVENLABS_API_KEY,
        model: "eleven_flash_v2_5",
        languageCode: "ko",
      }),
      turnHandling: {
        interruption: {
          enabled: true,
          minDuration: 500,
        },
      },
    });

    if (conversationId) {
      // 발화 저장을 직렬화한다. 이벤트가 연달아 와도 이전 저장이 끝난 뒤 다음을
      // 보내, Redis append 순서(=대화 순서)가 보장된다.
      let saveChain: Promise<void> = Promise.resolve();
      session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
        const item = ev.item;
        if (!("role" in item)) return;
        if (item.role !== "user" && item.role !== "assistant") return;
        const content = item.textContent;
        if (!content) return;
        const role = item.role;
        saveChain = saveChain.then(() =>
          persistMessage(conversationId, role, content),
        );
      });

      ctx.addShutdownCallback(async () => {
        // 큐에 남은 저장이 모두 끝난 뒤 flush한다.
        await saveChain;
        await flushConversation(conversationId);
      });
    }

    await session.start({
      agent: new voice.Agent({ instructions: buildInstructions(modelId) }),
      room: ctx.room,
    });

    session.generateReply({
      instructions:
        "Greet the child warmly in Korean (Hangul only) and ask what they'd like to do.",
    });
  },
});

cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "voice-agent",
  }),
);
