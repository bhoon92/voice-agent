## 아키텍처

[![아키텍처 다이어그램](https://mermaid.ink/img/pako:eNp1Ul1PE0EU_SuTeWpjKbv9oLAhJA2oQStBWiWR9WHbHbYr7W6d3RYUSEpSSDAlommQaktaQH0xsRqEkvjkT-GxO_sfnNndfqhxX-bO7Dnn3nvu3YQZXUZQgKs5fT2TlbAJUnOiBui3jtIrIiQfrsGvK7CANszgM2M6jcdnrHajd9UlzS77YVXLdr3Gol63Y7WbgLQ79vuqCJ-6KgbCJYSZUKVhfa-4WoZ5L-lIURHyqcke7b2WvdOxOo1ed3-oS1plcvIRxBfnB4I5tYTWVJMqJmh0XzXdmr52rVqNHF2A5J1HA6ykII0hybtD0rwgrYr9yinaY4I4-28A3wL1wO_oJFMpcLP3FiQSD5wzlUoywuP4nFNk5aLXOSSfy4MMGMmqseIT4RIL3FJcR2iz9sFPEfo9ZEFhsEXdMBWMkg8To1hyvEP2DlzswHwwNjazJcKbNy0wdHzcMwp4TvnuLaf8ItzyfB71HIwFHYGMrtGbIZmqrs3LrA2s63nGoUmG2ab76dqANKuk8g34llF6KTXryHuu_6nvEU5dnwE1oCCZmSy4BfLIlGTJlP6hepdhtjPa_Dkb3fE5oNOxTuqg9-OL9XqXtkp7tI_2mYaTYGSmg9znDohZ6G6KT9VMhDUp919THGJ_OFvuAEdm6QFWc0UjC3zkdNc6qzLPeM66rADrumLXG9QcR76g9MdlFNMKlgpZUMB6SZWp3Wzr6l3rsgzi88CuVegIrU6NbqF1UAM-p4lepwzs4y65bPgH-wSAgvXnlHyXHizvcpa6SutmiznO1nIEinKohDQKvu0ECSltMArd2QEIafJftg1LhAGoYFWGgomLKADzCOcldoWbjCJCM4vySIQCDWUJr4lQ1LYppyBpT-gC9WlYLypZKKxKOYPeigU6djSnStSO_OAV0zIQntWLmgmFUGTKEYHCJtyAQiwSDE_wXDQUDU3yXIjjA_AFFKJTQY7jQ-FwKMZPRDk-PLEdgC-dtFxwcnIqEopFQuFILMbHwtu_AfwY5tg)](https://mermaid.live/edit#pako:eNp1Ul1PE0EU_SuTeWpjKbv9oLAhJA2oQStBWiWR9WHbHbYr7W6d3RYUSEpSSDAlommQaktaQH0xsRqEkvjkT-GxO_sfnNndfqhxX-bO7Dnn3nvu3YQZXUZQgKs5fT2TlbAJUnOiBui3jtIrIiQfrsGvK7CANszgM2M6jcdnrHajd9UlzS77YVXLdr3Gol63Y7WbgLQ79vuqCJ-6KgbCJYSZUKVhfa-4WoZ5L-lIURHyqcke7b2WvdOxOo1ed3-oS1plcvIRxBfnB4I5tYTWVJMqJmh0XzXdmr52rVqNHF2A5J1HA6ykII0hybtD0rwgrYr9yinaY4I4-28A3wL1wO_oJFMpcLP3FiQSD5wzlUoywuP4nFNk5aLXOSSfy4MMGMmqseIT4RIL3FJcR2iz9sFPEfo9ZEFhsEXdMBWMkg8To1hyvEP2DlzswHwwNjazJcKbNy0wdHzcMwp4TvnuLaf8ItzyfB71HIwFHYGMrtGbIZmqrs3LrA2s63nGoUmG2ab76dqANKuk8g34llF6KTXryHuu_6nvEU5dnwE1oCCZmSy4BfLIlGTJlP6hepdhtjPa_Dkb3fE5oNOxTuqg9-OL9XqXtkp7tI_2mYaTYGSmg9znDohZ6G6KT9VMhDUp919THGJ_OFvuAEdm6QFWc0UjC3zkdNc6qzLPeM66rADrumLXG9QcR76g9MdlFNMKlgpZUMB6SZWp3Wzr6l3rsgzi88CuVegIrU6NbqF1UAM-p4lepwzs4y65bPgH-wSAgvXnlHyXHizvcpa6SutmiznO1nIEinKohDQKvu0ECSltMArd2QEIafJftg1LhAGoYFWGgomLKADzCOcldoWbjCJCM4vySIQCDWUJr4lQ1LYppyBpT-gC9WlYLypZKKxKOYPeigU6djSnStSO_OAV0zIQntWLmgmFUGTKEYHCJtyAQiwSDE_wXDQUDU3yXIjjA_AFFKJTQY7jQ-FwKMZPRDk-PLEdgC-dtFxwcnIqEopFQuFILMbHwtu_AfwY5tg)

- **web**: 사용자 인터페이스. LiveKit 룸에 접속해 마이크 송출/오디오 재생, 턴 상태·실시간 트랜스크립트 표시, 대화 기록 조회.
- **server**: 이름 기반 로그인(JWT), LiveKit 입장 토큰 발급, 대화 저장(Redis 버퍼 → PostgreSQL flush) 및 본인 기록 조회 API.
- **agent**: LiveKit 룸에 "참가자"로 합류해 사용자 오디오를 구독, STT→LLM→TTS 파이프라인을 돌리고 발화를 server에 저장.
- **LiveKit / PostgreSQL / Redis**: docker-compose로 로컬 구동.

프로젝트는 pnpm 모노레포(`apps/web`, `apps/server`, `apps/agent`)입니다.

---

## 기술 스택

| 영역            | 선택                                                              |
| --------------- | ----------------------------------------------------------------- |
| 미디어/실시간   | LiveKit (+ LiveKit Agents · Node)                                 |
| STT / LLM / TTS | Groq Whisper / Groq Qwen·Llama (+ Claude·GPT·Gemini) / ElevenLabs |
| VAD·턴 감지     | Silero (LiveKit 번들)                                             |
| 프론트엔드      | Next.js · @livekit/components-react                               |
| 백엔드          | NestJS                                                            |
| 인증            | JWT (이름 기반)                                                   |
| DB · 버퍼       | PostgreSQL + TypeORM · Redis                                      |
| 인프라          | Docker Compose                                                    |

---

## 로컬 실행 방법 (상세)

DB는 **PostgreSQL**을 사용합니다.
LiveKit·Redis와 함께 docker-compose로 한 번에 띄우므로, `docker compose up -d` 한 줄이면 인프라가 준비됩니다.

### STEP 0. 사전 설치

- **Node.js 22+** / **pnpm 10+**
  ```bash
  node -v   # v22 이상
  npm i -g pnpm   # pnpm 없으면
  ```
- **Docker** (PostgreSQL·Redis·LiveKit 구동). macOS에서 Docker Desktop이 없다면 colima 사용:
  ```bash
  brew install colima docker docker-compose && colima start
  docker ps   # 정상 동작 확인
  ```

### STEP 1. API 키 발급

- 메일 참조

| 서비스                 | 용도                           |
| ---------------------- | ------------------------------ |
| **Groq**               | STT(Whisper) + LLM(Qwen/Llama) |
| **Google AI Studio**   | LLM(Gemini 2.5 Flash)          |
| **ElevenLabs**         | TTS(한국어)                    |
| **Anthropic / OpenAI** | Claude / GPT-4o                |

### STEP 2. 클론 & 의존성 설치

```bash
git clone https://github.com/bhoon92/voice-agent.git && cd voice-agent
pnpm install
```

### STEP 3. 인프라 구동 (PostgreSQL·Redis·LiveKit)

```bash
docker compose up -d
docker ps   # voice-agent-postgres / -redis / -livekit 3개 확인
```

- PostgreSQL은 **호스트 5432**로 노출됩니다. (로컬에 이미 다른 PostgreSQL이 5432를 쓰고 있다면 중지하거나, `docker-compose.yml`·`.env`에서 포트를 바꾸세요.)
- 테이블은 TypeORM `synchronize`로 **첫 실행 시 자동 생성**(별도 마이그레이션 불필요).

### STEP 4. 환경변수 설정

```bash
cp apps/server/.env.example apps/server/.env
cp apps/agent/.env.example  apps/agent/.env
```

**`apps/server/.env`** — 기본값 그대로 두면 됩니다 (LLM 키 불필요):

```ini
PORT=4000
CORS_ORIGIN=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432            # ← docker postgres 포트
DB_USERNAME=voice
DB_PASSWORD=voice
DB_NAME=voice_agent
REDIS_HOST=localhost
REDIS_PORT=6379
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
JWT_SECRET=change-me
INTERNAL_API_SECRET=dev-internal-secret   # ← agent와 동일해야 함
```

**`apps/agent/.env`** — **여기에 API 키를 넣습니다**:

```ini
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
GROQ_API_KEY=...          # ← 발급한 키
GOOGLE_API_KEY=...        # ← 발급한 키
ELEVENLABS_API_KEY=...    # ← 발급한 키
ANTHROPIC_API_KEY=        # (선택)
OPENAI_API_KEY=           # (선택)
SERVER_URL=http://localhost:4000
INTERNAL_API_SECRET=dev-internal-secret   # ← server와 동일해야 함
```

**`apps/web/.env.local`** — 생성:

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > apps/web/.env.local
```

> ⚠️ `INTERNAL_API_SECRET`는 **server·agent가 같은 값**이어야 대화가 저장됩니다.

### STEP 5. 실행 (터미널 3개)

각각 별도 터미널에서(로그가 분리돼 디버깅에 편함):

```bash
pnpm dev:server   # 터미널 1 — http://localhost:4000 (인증·토큰·대화저장)
pnpm dev:web      # 터미널 2 — http://localhost:3000 (웹 UI)
pnpm dev:agent    # 터미널 3 — 음성 에이전트 워커
```

또는 한 번에 모두 띄우려면(로그는 한 터미널에 섞임):

```bash
pnpm dev:all
```

### STEP 6. 사용

1. **http://localhost:3000** 접속 → 이름 입력 후 **시작** (이름 기반 로그인)
2. **AI 모델 선택**(기본 Qwen, 한국어) → **대화 시작** → 마이크 권한 허용 → 한국어로 말 걸기
3. **턴 상태**(듣는 중/생각 중/말하는 중)와 **실시간 대화 로그** 확인, AI가 말할 때 끼어들면 멈춤
4. **나가기** → 대화 자동 저장(Redis→PostgreSQL)
5. **📜 내 기록** 탭에서 저장된 대화 다시 보기 (같은 이름으로 로그인하면 유지, 방 코드로 구분)

### 모니터링 (실시간 텍스트 관찰)

관리자(모니터링)가 진행 중인 대화를 실시간으로 지켜볼 수 있습니다.

1. 대화 화면 헤더의 **방 코드**(예: `A3K9XQ`)를 모니터에게 공유
2. 모니터: 로그인 → **관찰하기** 탭 → 방 코드 입력 → **관찰 입장**
3. 아이 ↔ AI가 주고받는 **텍스트가 실시간으로** 표시 (음성·마이크 없음 → 대화에 영향 없음)

---

### 추가 구현 (요구사항 외)

- **실시간 텍스트 모니터링**: 모니터가 방 코드로 입장하면 server가 그 방의 대화(진행 중이면 Redis 버퍼, 끝났으면 DB)를 **polling으로 제공** → 입장 직후 **기존 대화부터** 보이고 2초마다 갱신됩니다. LiveKit 음성에 합류하지 않아 **대화에 전혀 영향이 없습니다**.
- **화자 시각화**: 대화창 위에 **화자 칩(왼쪽=AI 친구, 오른쪽=나)** 을 두고, 말하는 사람의 아바타에 초록불이 켜집니다(`useSpeakingParticipants`). 누가 발화 중인지 직관적으로 보입니다.
- **연결 복원력**: 첫 접속 시 WebRTC PeerConnection의 콜드 스타트로 ICE 연결이 타임아웃 나는 경우가 있어, ① `peerConnectionTimeout` 상향·조인 재시도(`connectOptions`)와 ② 실패 시 **자동 재연결(최대 2회)** 의 2중 안전망을 뒀습니다. 끊김 사유는 화면에 노출해 디버깅 가능하게 했습니다.

### 미구현 / 제약

- **LLM**: Qwen·Llama(Groq 무료) + Claude·GPT·Gemini를 드롭다운에서 선택할 수 있게 구현돼 있습니다. Claude/GPT/Gemini는 해당 **API 키가 있어야 실제 응답**하며, 키는 메일로 전달드립니다(미설정 시 기본 Qwen으로 동작).
- **인증**: 비밀번호 없는 **이름 기반 간이 인증**입니다. 요구사항의 "인증을 통한 본인 기록 확인" 범위에 맞춘 선택이며, 실서비스에선 비밀번호/OAuth 등으로 강화 필요.
- **동시성 부하**: 무료 API 티어의 rate limit 때문에 대규모 동시 접속 시 한계. 유료 키 전환으로 스케일 가능.

---

## 설계/구현 중 중점 둔 포인트

1. **프로바이더 추상화로 교체 비용 최소화**
   `createLLM(modelId)` 한 곳에서 모델을 분기하고, STT/TTS도 플러그인으로 분리했습니다. <br>
   실제로 개발 중 TTS를 (Groq PlayAI 폐기 → Gemini rate limit → ElevenLabs) 여러 번 교체했는데, **매번 한 군데만 수정**하면 됐습니다. LLM도 동일하게 무료/유료 모델을 드롭다운으로 갈아끼웁니다.

2. **대화 저장의 안정성 (Redis 버퍼 + 다중 안전망)**
   대화의 source of truth는 브라우저가 아니라 **서버사이드 agent**입니다(브라우저가 죽어도 agent는 대화를 보유).
   그 위에 좀비 세션·데이터 유실을 막는 **여러 계층**을 뒀습니다:
   - **버퍼링**: 발화가 확정될 때마다 Redis에 적재 (agent 크래시·DB 일시 장애에 강함)
   - **정상 종료**: 세션 종료 시 즉시 Redis → PostgreSQL flush
   - **비정상 종료**: 주기 스캐너가 **10분 이상 비활성** 대화를 자동 flush (종료 신호가 유실돼도 보존)
   - **flush 실패 시 재시도**: DB 저장이 **성공한 뒤에만** Redis를 비워, 저장이 실패하면 active 집합에 남겨 다음 스캔이 재시도 (데이터가 Redis에 갇히거나 유실되지 않음)
   - **TTL + 부팅 복구**: 버퍼 키에 24h TTL로 무한 누적 방지 + 서버 부팅 시 잔여 버퍼를 1회 즉시 정리

3. **동시성: 세션별 고유 룸 + explicit agent dispatch**
   - 접속할 때마다 서버가 **6자리 영숫자 룸 코드**를 발급(중복이면 재생성)하여 각 사용자가 자기 룸에서 대화 → **사용자 간 완전 격리**.
   - **agent 워커 하나가 여러 룸의 job을 동시 병렬 처리** → N명 접속 = N개의 1:1 세션이 서로 섞이지 않고 동시에 진행.
   - 토큰에 agent dispatch를 명시(explicit) → 새 룸마다, **새로고침/재접속 시에도 agent가 매번 정확히 합류**.
   - 격리는 데이터 레벨에서도 보장: 대화 조회는 JWT의 user + `conversationId`로 묶여 **본인 것만** 반환(타인 조회 시 404).
   - 룸 코드(예: `A3K9XQ`)는 `conversations` 테이블에 저장되어, 나중에 기록 화면에서 어느방의 대화였는지 함께 확인할 수 있습니다.
   - 한계: 무료 API 티어의 rate limit이 실질적인 동시성 상한입니다(유료 키로 해소).

4. **턴/로그를 LiveKit 데이터로 일관 처리**
   턴 상태(`useVoiceAssistant`)와 트랜스크립트(`useTranscriptions`)를 LiveKit이 발행하는 동일 데이터로 처리해, 발화 차례 표시와 대화 로그가 한 소스에서 나옵니다.

5. **인증과 권한 격리**
   대화 조회 API는 JWT의 사용자 id로 **본인 대화만** 반환합니다(타인 조회 시 404).
   agent↔server 내부 API는 공유 시크릿으로 분리 보호합니다.

---

## 추후 고려 사항

- **Claude/GPT 네이티브 연동**: 현재 Claude는 LiveKit JS에 네이티브 플러그인이 없어 Anthropic의 OpenAI 호환 엔드포인트로 브리지했습니다.
  프로덕션에선 Anthropic SDK 기반의 LiveKit `llm.LLM` 어댑터를 직접 구현하는 것이 정석입니다.
- **미디어 스케일링 / 실시간 계층 수평 확장**: 현재는 단일 LiveKit(dev) + 단일 agent 워커.
  운영에선 **LiveKit 멀티노드(노드 간 조율에 Redis 사용) + 셀프호스트(Go 기반)** 또는 LiveKit Cloud로, agent는 **워커 풀**로 확장합니다.
  LiveKit job dispatch가 워커 풀에 작업을 분산하고, 대화 버퍼를 **공유 Redis**에 두는 현재 구조라 어느 워커/인스턴스가 받아도 세션이 끊기지 않습니다.
  (Socket.IO를 **Redis Adapter**로 다중 노드 확장하던 방식과 같은 결 — 연결/세션 상태를 공유 저장소로 빼 인스턴스를 무상태화하는 접근입니다.)
- **모니터링을 polling → push로**: 현재 관찰 화면이 2초 polling입니다.
  규모가 커지면 **Socket.IO / SSE + Redis pub-sub**로 전환해, 발화가 생길 때만 모니터링 대시보드로 푸시하는 게 효율적입니다(불필요한 요청 제거·지연 감소). 실시간 대시보드에 특히 적합합니다.
- **클라우드 배포 + 매니지드 인프라**: server/agent를 컨테이너로 오토스케일(App Service/ECS 등), Redis는 **매니지드 캐시**(Azure Redis Cache·ElastiCache), 음성 원본·리포트는 **오브젝트 스토리지**(Blob/S3)에 두는 구성하는 것이 좋을 것 같습니다.
- **음성 원본 아카이빙**: 현재는 텍스트 트랜스크립트만 저장합니다. 품질 점검·분쟁 대비로 **원본 오디오를 오브젝트 스토리지에 보관**(서명 URL로 접근 제어)하는 확장이 필요합니다.
- **인증 강화**: 현재는 이름(아이디)만으로 로그인 가능하게 구현했습니다. 이후 비밀번호/소셜 로그인, refresh token 추가, **학생·관리자·교사 등 역할 기반 권한(RBAC)** 으로 관찰 권한 분리가 필요합니다.
- **TTS 한국어 고도화**: 음성 톤/속도/감정 등 아동 친화적 튜닝, 비용·지연 균형.
- **관측성**: 대화 품질·지연(STT/LLM/TTS 각 구간) 메트릭, 에러 추적
- **영상/아바타**: 실시간 화상·아바타로 확장 시 LiveKit의 비디오 트랙을 활용하는 것이 좋습니다.
- **에러추적**: 기본적인 error logging만 해놓은 상태라, 운영 및 개발단계를 위해서는 프론트 <-> 백엔드 간 명확한 에러 컨벤션이 필요합니다.
