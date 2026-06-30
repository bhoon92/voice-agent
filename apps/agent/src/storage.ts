const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:4000";
const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET ?? "";

type Role = "user" | "assistant";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_TOKEN,
  };
}
export async function persistMessage(
  conversationId: string,
  role: Role,
  content: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${SERVER_URL}/internal/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ role, content }),
      },
    );
    // fetch는 4xx/5xx에서 throw하지 않으므로 직접 확인해야 한다.
    // (안 그러면 인증 실패·서버 오류 시 발화가 소리 없이 유실된다.)
    if (!res.ok) {
      console.error(
        `[storage] persistMessage rejected: ${res.status} ${res.statusText}`,
      );
    }
  } catch (err) {
    console.error("[storage] persistMessage failed:", err);
  }
}

export async function flushConversation(conversationId: string): Promise<void> {
  try {
    const res = await fetch(
      `${SERVER_URL}/internal/conversations/${conversationId}/flush`,
      { method: "POST", headers: headers() },
    );
    if (!res.ok) {
      console.error(
        `[storage] flushConversation rejected: ${res.status} ${res.statusText}`,
      );
    }
  } catch (err) {
    console.error("[storage] flushConversation failed:", err);
  }
}
