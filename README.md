# Where Is It?

[한국어](#한국어) · [English](#english)

---

## 한국어

Telegram으로 물건 위치를 기록하고, 질문하면 가장 최근 위치를 알려주는 AI 에이전트

**봇:** [t.me/Whereisit_finder_bot](https://t.me/Whereisit_finder_bot)

### 사용법

| 기능 | 예시 메시지                   |
| ---- | ----------------------------- |
| 저장 | 여권을 침실 서랍에 넣었어     |
| 검색 | 여권 어디 있어?               |
| 이동 | 여권을 거실 수납장으로 옮겼어 |

- 한국어, 영어 지원
- 채팅방별 기록 분리
- 물건 이름과 위치만 저장

### 구조

```
Telegram → 웹훅 (비밀값 검사) → 에이전트 → record_location / find_location → Telegram 답장
```

- [Flue](https://flueframework.com) + Cloudflare Workers
- 모델: Workers AI `gemma-4-26b-a4b-it` (무료)
- 저장: `usePersistentState` (Durable Object)

### 실행

```sh
cd flue-backend && npm install
# .dev.vars 에 TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN 작성
npm run build && npx wrangler deploy --secrets-file .dev.vars   # 첫 배포
npm run deploy                                                  # 이후 배포
```

- 웹훅 등록: Telegram `setWebhook`에 `<worker 주소>/channels/telegram/webhook`과 `secret_token` 전달 (최초 1회)

### 알려진 문제

- 느린 응답 (메시지당 모델 2~3회 호출 + 긴 reasoning)
- 간헐적 무응답 (답하는 중 보낸 메시지는 합쳐짐, 모델이 답장 도구를 건너뛸 가능성)
- 동의어 검색 실패 가능 (`seal` 저장 후 `stamp` 검색)
- 색상, 종류 등 특징 저장 불가

### 다음 단계

- 모델 교체 (예: Claude)
- 동의어 검색 개선
- 메모 칸 추가
- 사진 추가

---

## English

An AI agent that remembers where you put things. Tell it on Telegram, and ask later for the latest location.

**Bot:** [t.me/Whereisit_finder_bot](https://t.me/Whereisit_finder_bot)

### Usage

| Action | Example                                        |
| ------ | ---------------------------------------------- |
| Save   | I put my passport in the bedroom drawer        |
| Find   | Where is my passport?                          |
| Move   | I moved my passport to the living room cabinet |

- Korean and English
- Records are kept per chat
- Only item names and locations are saved

### How it works

```
Telegram → webhook (secret check) → agent → record_location / find_location → Telegram reply
```

- [Flue](https://flueframework.com) + Cloudflare Workers
- Model: Workers AI `gemma-4-26b-a4b-it` (free)
- Storage: `usePersistentState` (Durable Object)

### Run

```sh
cd flue-backend && npm install
# put TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET_TOKEN in .dev.vars
npm run build && npx wrangler deploy --secrets-file .dev.vars   # first deploy
npm run deploy                                                  # later deploys
```

- Webhook: call Telegram `setWebhook` with `<worker url>/channels/telegram/webhook` and `secret_token` (once)

### Known issues

- Slow replies (2–3 model calls per message + long reasoning)
- Occasional missing replies (messages sent mid-reply are merged; the model may skip the reply tool)
- Synonyms may not match (saved as `seal`, searched as `stamp`)
- Details like color or type cannot be saved

### Next steps

- Switch models (e.g. Claude)
- Better synonym search
- Add a notes field
- Add photos
