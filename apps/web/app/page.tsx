"use client";

import { useEffect, useRef, useState } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useTranscriptions,
  useLocalParticipant,
  useSpeakingParticipants,
} from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_KEY = "voice-auth";

type Auth = { token: string; name: string };
type Connection = {
  token: string;
  url: string;
  identity: string;
  room?: string;
};
type ModelOption = { id: string; label: string; available: boolean };

const MODELS: ModelOption[] = [
  { id: "groq-qwen", label: "Qwen3 32B · Groq - 무료버전", available: true },
  {
    id: "groq-llama",
    label: "Llama 3.3 70B · Groq - 무료버전",
    available: true,
  },
  {
    id: "claude",
    label: "Claude Haiku 4.5 · Anthropic - key없음",
    available: true,
  },
  { id: "gpt-4o", label: "GPT-4o · OpenAI - key없음", available: true },
  {
    id: "gemini-flash",
    label: "Gemini 2.5 Flash · Google",
    available: true,
  },
];

// LiveKit 끊김 사유를 사람이 읽을 수 있는 메시지로. 진단을 위해 enum 값도 같이 보여준다.
function describeDisconnect(reason?: DisconnectReason): string | null {
  // 사용자가 직접 나간 경우(나가기 버튼)는 에러로 취급하지 않는다.
  if (reason == null || reason === DisconnectReason.CLIENT_INITIATED)
    return null;
  const map: Partial<Record<DisconnectReason, string>> = {
    [DisconnectReason.DUPLICATE_IDENTITY]:
      "같은 사용자가 다른 곳에서 접속했어요.",
    [DisconnectReason.SERVER_SHUTDOWN]: "미디어 서버가 종료됐어요.",
    [DisconnectReason.PARTICIPANT_REMOVED]: "방에서 내보내졌어요.",
    [DisconnectReason.ROOM_DELETED]: "방이 닫혔어요.",
    [DisconnectReason.JOIN_FAILURE]:
      "미디어 서버 접속에 실패했어요. (네트워크·주소·인증서 확인)",
  };
  return map[reason] ?? `연결이 끊어졌어요. (사유 코드 ${reason})`;
}

export default function Home() {
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      try {
        setAuth(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function login(a: Auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(a));
    setAuth(a);
  }
  function logout() {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
  }

  if (!auth) return <LoginScreen onLogin={login} />;
  return <MainApp auth={auth} onLogout={logout} />;
}

function LoginScreen({ onLogin }: { onLogin: (a: Auth) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`로그인 실패 (${res.status})`);
      const data = await res.json();
      onLogin({ token: data.token, name: data.user.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          AI 음성 친구
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          이름을 입력하면 시작해요. (비밀번호 없이 이름으로 기록을 구분합니다)
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) submit();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            autoFocus
            className="mt-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "시작 중…" : "시작하기"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </main>
  );
}

function MainApp({ auth, onLogout }: { auth: Auth; onLogout: () => void }) {
  const [view, setView] = useState<"home" | "history" | "observe">("home");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [model, setModel] = useState("groq-qwen");
  const [observeRoom, setObserveRoom] = useState("");
  const [observingRoom, setObservingRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 첫 연결은 ICE 콜드 스타트로 PeerConnection이 타임아웃 나기 쉽다.
  // 일시적 실패면 자동으로 재연결해서 사용자가 다시 누르지 않도록 한다.
  const [connectAttempt, setConnectAttempt] = useState(0);
  const MAX_RETRY = 2;

  // 연결 실패 시: 재시도 한도가 남았으면 LiveKitRoom을 다시 마운트(key 변경)해
  // 재연결, 한도를 넘으면 종료하고 사유를 보여준다.
  function retryOrFail(failMsg: string | null) {
    if (connectAttempt < MAX_RETRY) {
      setTimeout(() => setConnectAttempt((n) => n + 1), 600);
      return;
    }
    setConnection(null);
    setConnectAttempt(0);
    if (failMsg) setError(failMsg);
  }

  async function handleStart() {
    const selected = MODELS.find((m) => m.id === model);
    if (!selected?.available) {
      setError("아직 준비중이에요! 다른 모델을 선택해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/livekit/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) throw new Error(`토큰 발급 실패 (${res.status})`);
      const data = await res.json();
      setConnectAttempt(0);
      setConnection({
        token: data.token,
        url: data.url,
        identity: data.identity,
        room: data.room,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  function handleObserve() {
    const code = observeRoom.trim().toUpperCase();
    if (code.length !== 6) {
      setError("6자리 방 코드를 입력해주세요.");
      return;
    }
    setError(null);
    setObservingRoom(code);
  }

  if (connection) {
    return (
      <LiveKitRoom
        key={connectAttempt}
        token={connection.token}
        serverUrl={connection.url}
        connect
        audio
        // 첫 연결의 ICE 콜드 스타트를 견디도록 PeerConnection 타임아웃을 넉넉히(기본 15s→30s),
        // 서버가 잠깐 안 잡힐 때를 대비해 조인 재시도도 둔다.
        connectOptions={{ peerConnectionTimeout: 30000, maxRetries: 3 }}
        onDisconnected={(reason) => {
          const msg = describeDisconnect(reason);
          // 사용자가 직접 나간 경우(msg 없음)는 재시도 없이 종료.
          if (msg == null) {
            setConnection(null);
            setConnectAttempt(0);
            return;
          }
          retryOrFail(msg);
        }}
        onError={(e) => retryOrFail(`연결 오류: ${e.message}`)}
        className="min-h-screen bg-zinc-50 dark:bg-zinc-950"
      >
        <RoomAudioRenderer />
        <RoomView
          room={connection.room}
          onLeave={() => {
            setConnectAttempt(0);
            setConnection(null);
          }}
        />
      </LiveKitRoom>
    );
  }

  if (observingRoom) {
    return (
      <ObserverView
        auth={auth}
        room={observingRoom}
        onLeave={() => setObservingRoom(null)}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          안녕, <b className="text-zinc-800 dark:text-zinc-100">{auth.name}</b>!
        </span>
        <button
          onClick={onLogout}
          className="text-xs text-zinc-400 underline hover:text-zinc-600"
        >
          로그아웃
        </button>
      </header>

      <div className="flex gap-2">
        <button
          onClick={() => setView("home")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            view === "home"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          🎙️ 대화하기
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            view === "history"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          📜 내 기록
        </button>
        <button
          onClick={() => {
            setView("observe");
            setError(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            view === "observe"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          👀 관찰하기
        </button>
      </div>

      {view === "observe" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-xs font-medium text-zinc-500">
            관찰할 방 코드 (6자리)
          </label>
          <p className="mt-1 text-xs text-zinc-400">
            진행 중인 대화방의 내용을 실시간 텍스트로 관찰합니다. (음성·마이크
            없음 · 대화에 영향 없음)
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) handleObserve();
            }}
          >
            <input
              value={observeRoom}
              onChange={(e) => {
                setObserveRoom(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="예: A3K9XQ"
              maxLength={6}
              autoFocus
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "입장 중…" : "관찰 입장"}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      ) : view === "home" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-xs font-medium text-zinc-500">
            대화할 AI 모델
          </label>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "연결 중…" : "대화 시작"}
          </button>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      ) : (
        <HistoryView auth={auth} />
      )}
    </main>
  );
}

type ConvSummary = {
  id: string;
  room: string;
  model: string;
  startedAt: string;
};
type ConvDetail = {
  id: string;
  room: string;
  model: string;
  startedAt: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

function HistoryView({ auth }: { auth: Auth }) {
  const [list, setList] = useState<ConvSummary[] | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, [auth.token]);

  async function open(id: string) {
    const res = await fetch(`${API_URL}/conversations/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) setDetail(await res.json());
  }

  if (detail) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setDetail(null)}
          className="mb-3 text-xs text-zinc-400 underline hover:text-zinc-600"
        >
          ← 목록으로
        </button>
        <p className="mb-3 text-xs text-zinc-500">
          방 <span className="font-mono font-semibold">{detail.room}</span> ·{" "}
          {new Date(detail.startedAt).toLocaleString("ko-KR")} · {detail.model}
        </p>
        <ul className="space-y-3">
          {detail.messages.map((m, i) => (
            <li
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                <span className="mb-0.5 block text-[10px] opacity-60">
                  {m.role === "user" ? "나" : "친구"}
                </span>
                {m.content}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {list === null ? (
        <p className="text-center text-sm text-zinc-400">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="text-center text-sm text-zinc-400">
          아직 저장된 대화가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {list.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => open(c.id)}
                className="flex w-full items-center justify-between py-3 text-left hover:opacity-70"
              >
                <span className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-zinc-800">
                    {c.room}
                  </span>
                  {new Date(c.startedAt).toLocaleString("ko-KR")}
                </span>
                <span className="text-xs text-zinc-400">{c.model}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TURN: Record<string, { label: string; cls: string }> = {
  listening: {
    label: "🎤 듣는 중 · 당신 차례",
    cls: "bg-blue-100 text-blue-700",
  },
  thinking: { label: "💭 생각 중…", cls: "bg-amber-100 text-amber-700" },
  speaking: {
    label: "🔊 말하는 중 · AI 차례",
    cls: "bg-green-100 text-green-700",
  },
  initializing: { label: "연결 중…", cls: "bg-zinc-100 text-zinc-600" },
};

// 디스코드 스타일 화자 칩: 아바타 + 닉네임. 말하는 중이면 아바타에 초록불이 켜진다.
// 왼쪽(친구)·오른쪽(나)에 하나씩만 고정 표시한다.
function SpeakerChip({
  label,
  speaking,
  reverse,
}: {
  label: string;
  speaking: boolean;
  reverse?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white transition-all ${
          speaking
            ? "ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
            : ""
        }`}
      >
        {label.charAt(0)}
        {speaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-zinc-900" />
        )}
      </div>
      <div className={`flex flex-col ${reverse ? "items-end" : "items-start"}`}>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {label}
        </span>
        <span
          className={`text-[10px] ${
            speaking ? "font-medium text-green-500" : "text-zinc-400"
          }`}
        >
          {speaking ? "말하는 중" : "대기"}
        </span>
      </div>
    </div>
  );
}

function RoomView({ room, onLeave }: { room?: string; onLeave: () => void }) {
  const { state: agentState, agent } = useVoiceAssistant();
  const speakingParticipants = useSpeakingParticipants();
  const transcriptions = useTranscriptions();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const speakingIds = new Set(speakingParticipants.map((p) => p.identity));
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcriptions.length]);

  const turn = TURN[agentState] ?? {
    label: agentState,
    cls: "bg-zinc-100 text-zinc-600",
  };

  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          AI 음성 대화
          {room && (
            <span className="ml-2 font-mono text-xs text-zinc-400">
              방 {room}
            </span>
          )}
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${turn.cls}`}
        >
          {turn.label}
        </span>
      </header>

      <div className="flex items-center justify-between px-1">
        <SpeakerChip
          label="친구"
          speaking={agent ? speakingIds.has(agent.identity) : false}
        />
        <SpeakerChip
          label="나"
          speaking={speakingIds.has(localParticipant.identity)}
          reverse
        />
      </div>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {transcriptions.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-400">
            마이크에 대고 말을 걸어보세요…
          </p>
        ) : (
          <ul className="space-y-3">
            {transcriptions.map((t, i) => {
              const isAgent = t.participantInfo.identity === agent?.identity;
              return (
                <li
                  key={t.streamInfo?.id ?? i}
                  className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isAgent
                        ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] opacity-60">
                      {isAgent ? "친구" : "나"}
                    </span>
                    {t.text}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() =>
            localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
          }
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700 dark:text-zinc-50"
        >
          {isMicrophoneEnabled ? "🎙️ 마이크 켜짐" : "🔇 마이크 꺼짐"}
        </button>
        <button
          onClick={onLeave}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          나가기
        </button>
      </div>
    </div>
  );
}

type LiveMessage = { role: "user" | "assistant"; content: string };

function ObserverView({
  auth,
  room,
  onLeave,
}: {
  auth: Auth;
  room: string;
  onLeave: () => void;
}) {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">(
    "loading",
  );
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`${API_URL}/conversations/observe/${room}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!active) return;
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setMessages(data.messages ?? []);
        setStatus("ok");
      } catch {
        /* 일시적 네트워크 오류는 다음 polling에서 회복 */
      }
    }
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [room, auth.token]);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  return (
    <main className="mx-auto flex h-screen max-w-lg flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          👀 관찰 중
          <span className="ml-2 font-mono text-xs text-zinc-400">
            방 {room}
          </span>
        </h1>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
          실시간 텍스트
        </span>
      </header>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {status === "notfound" ? (
          <p className="mt-10 text-center text-sm text-red-500">
            해당 방을 찾을 수 없어요. 코드를 확인해주세요.
          </p>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-400">
            아직 대화가 없어요. 대화가 시작되면 여기에 표시됩니다…
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => {
              const isAgent = m.role === "assistant";
              return (
                <li
                  key={i}
                  className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isAgent
                        ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] opacity-60">
                      {isAgent ? "친구" : "아이"}
                    </span>
                    {m.content}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        onClick={onLeave}
        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
      >
        관찰 종료
      </button>
    </main>
  );
}
