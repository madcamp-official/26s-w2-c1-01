# 26s-w2-c1-01

## 공통과제 II : 협업형 실전 산출물 제작 (2인 1팀)

**목적:** 실시간 인터랙션, LLM Wrapper, Cross-Platform 중 하나의 옵션을 선택해 구현하며, 선택한 기술을 실제로 동작하는 형태의 산출물로 완성한다.

**선택 옵션:**

| 옵션 | 설명 |
|---|---|
| 실시간 인터랙션 | 사용자 간 상태 변화, 실시간 데이터 흐름, 스트리밍 응답 등 실시간성이 드러나는 기능을 구현 |
| LLM Wrapper | LLM API를 활용하여 AI 기능이 포함된 산출물을 구현 |
| Cross-Platform | 하나의 산출물을 여러 실행 환경에서 사용할 수 있도록 구현* |

> *데스크톱 앱 ↔ 모바일 앱; 혹은 다른 폼팩터에서의 앱; 웹만/웹 기반 프레임워크(Electron, Tauri 등) 대신 다른 프레임워크를 시도해보는 것을 적극 권장

**결과물:** 선택한 옵션이 적용된 작동 가능한 산출물, 실행 가능한 코드, 시연 자료 및 관련 문서

---

## 팀원

| <img src="https://github.com/terry2549.png" width="120" /> | <img src="https://github.com/yxxnxyxxn.png" width="120" /> |
|---|---|
| **김태현** | **유나연** |
| KAIST | 고려대학교 |
| [terry2549](https://github.com/terry2549) | [yxxnxyxxn](https://github.com/yxxnxyxxn) |
| 벡엔드 | 프론트엔드 |

---

## 선택 옵션

- [ ] 실시간 인터랙션
- [x] LLM Wrapper
- [ ] Cross-Platform

---

## 기획안

- **산출물 주제:** 채용공고 맞춤 이력서 작성 내용 추천 서비스
- **제작 목적:** 사용자가 입력한 채용공고와 개인 포트폴리오 자료를 LLM으로 구조화·비교하여, 지원 직무에 적합한 프로젝트와 경험을 선별하고 근거 기반의 이력서 작성 내용을 추천한다. 적합한 경험이 부족한 경우에는 부족 역량을 보완할 수 있는 실행 가능한 프로젝트도 제안한다.
- **선택 옵션:** LLM Wrapper — 채용공고와 사용자 포트폴리오를 분석·매칭하고, 사실에 근거한 이력서 작성 내용 및 보완 프로젝트를 생성한다.
- **핵심 구현 요소:**
  - 채용공고 URL 또는 이미지에서 담당 업무, 자격 요건, 우대 사항, 요구 역량을 추출하고 공통 스키마로 구조화
  - GitHub, Notion, 블로그, 개인 홈페이지, PDF 이력서 등에서 사용자 경험을 수집하고 프로젝트 단위로 분리·편집
  - 채용공고와 프로젝트를 의미적으로 매칭하여 추천 순위, 강조할 경험, 지원서 문장 초안, 추천 근거를 제공
  - 부족한 역량을 탐지하고 기간·난이도·산출물이 포함된 보완 프로젝트를 추천
- **사용 / 시연 시나리오:** 용자가 지원 직군을 선택하고 채용공고 URL 또는 이미지를 등록한다. 이후 GitHub URL, 포트폴리오 URL, PDF 이력서 등을 등록하면 시스템이 자료를 수집하여 프로젝트 후보를 생성한다. 사용자는 프로젝트 단위로 내용을 확인·수정한 뒤 분석을 실행한다. 서비스는 채용공고 요구 역량, 추천 프로젝트 순위, 이력서에 포함할 핵심 내용과 문장 초안, 각 추천의 출처 근거, 부족 역량 및 보완 프로젝트를 결과 화면에 제공한다.
- **팀원별 역할:** 김태현은 백엔드 API, 데이터베이스, 외부 URL·파일 파싱, LLM 분석 파이프라인, 공고-프로젝트 매칭을 담당한다. 유나연은 입력·업로드 화면, 프로젝트 편집 화면, 분석 진행 상태, 추천 결과 및 근거 시각화 등 프론트엔드를 담당한다. API 명세와 데이터 스키마는 공동으로 정의하고 통합 테스트를 함께 수행한다.


### 개발 일정

| 날짜 | 목표 |
|---|---|
| Day 1 |  |
| Day 2 |  |
| Day 3 |  |
| Day 4 |  |
| Day 5 |  |
| Day 6 |  |
| Day 7 |  |

---

## 구현 명세서

| 구현 요소 | 설명 | 우선순위 |
|---|---|---|
| 채용공고 입력 및 구조화 | URL, 이미지 또는 직접 입력된 채용공고에서 회사명, 직무, 담당 업무, 필수·우대 요건, 역량 키워드를 추출하여 JSON 형태로 저장한다. URL 접근 실패 시 이미지 또는 직접 입력으로 대체할 수 있어야 한다. | 필수 |
| 포트폴리오 수집 및 프로젝트 단위 관리 | GitHub, 공개 Notion, Velog/Tistory, 개인 포트폴리오 URL, PDF 이력서에서 내용을 수집한다. 수집 결과를 프로젝트 단위로 자동 분리하고 사용자가 제목, 역할, 기술, 문제 해결, 성과, 출처를 수정·병합·제외할 수 있게 한다. | 필수 |
| 채용공고-프로젝트 매칭 및 이력서 내용 추천 | 공고 요구 역량과 사용자 프로젝트를 비교하여 적합도 순위를 계산하고, 강조할 경험·기술·문제 해결 과정·성과 및 이력서 문장 초안을 생성한다. 모든 추천에는 원문 출처와 근거를 연결하며 확인되지 않은 수치나 경험은 생성하지 않는다. | 필수 |
| 부족 역량 및 보완 프로젝트 추천 | 공고에서 요구하지만 사용자 자료에서 확인되지 않은 역량을 추출하고, 목표 역량·핵심 기능·예상 기간·산출물이 포함된 보완 프로젝트를 제안한다. | 필수 |
| 결과 내보내기 | 추천 내용을 복사하거나 Markdown/PDF 형식으로 내보내고, 사용자가 수정한 내용을 저장할 수 있도록 한다. | 선택 |
| 사용자 계정 및 분석 기록 | 로그인, 사용자별 포트폴리오와 공고 관리, 이전 분석 비교 기능을 제공한다. 단기 MVP에서는 로컬 세션 또는 테스트 계정으로 대체할 수 있다. | 선택 |

---

## 아키텍처

<!-- 실시간 인터랙션: WebSocket/SSE/WebRTC 구조도 / LLM Wrapper: API 연동 흐름도 / Cross-Platform: 플랫폼 구성도 -->

---

## 설계 문서

> 프로젝트 성격에 따라 필요한 항목만 작성

### 화면 / 인터페이스 설계

<!-- Figma 링크, 화면 이미지, CLI 사용 예시, 앱 화면 등 -->

### 데이터 구조

<!-- DB 스키마, JSON 구조, 파일 저장 방식 등 -->

### API / 외부 서비스 연동

| Method / 방식 | Endpoint / 서비스 | 설명 | 요청 | 응답 | 비고 |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

---

## 산출물 및 실행 방법

- **산출물 설명:**
- **실행 환경:**
- **실행 방법:**
- **시연 영상 / 이미지:** (선택)

### 실행 방법

```bash
# 환경 설정
cp .env.example .env

# 의존성 설치
npm install   # 또는 pip install -r requirements.txt 등

# 실행
npm run dev   # 또는 python main.py 등
```

### 기술 구성

| 분류 | 사용 기술 |
|---|---|
| 핵심 기술 |  |
| 실행 환경 |  |
| 데이터 저장 |  |
| 외부 API / 서비스 |  |
| 기타 |  |

---

## 회고 문서

> [KPT 방법론 참고](https://velog.io/@habwa/%EB%8B%A8%EA%B8%B0-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%9A%8C%EA%B3%A0-KPT-%EB%B0%A9%EB%B2%95%EB%A1%A0)

### Keep — 잘 된 점, 다음에도 유지할 것

-
-
-

### Problem — 아쉬웠던 점, 개선이 필요한 것

-
-
-

### Try — 다음번에 시도해볼 것

-
-
-

### 팀원별 소감

**정서영:**

> 

**이서진A:**

> 

---

## 참고 자료

### 실시간 인터랙션

**WebSocket**
- https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- https://techblog.woowahan.com/5268/
- https://tech.kakao.com/posts/391
- https://daleseo.com/websocket/
- https://kakaoentertainment-tech.tistory.com/110

**Socket.IO**
- https://socket.io/docs/v4/
- https://inpa.tistory.com/entry/SOCKET-%F0%9F%93%9A-Namespace-Room-%EA%B8%B0%EB%8A%A5
- https://adjh54.tistory.com/549
- https://fred16157.github.io/node.js/nodejs-socketio-communication-room-and-namespace/

**SSE (Server-Sent Events)**
- https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- https://developer.mozilla.org/ko/docs/Web/API/Server-sent_events/Using_server-sent_events
- https://api7.ai/ko/blog/what-is-sse

**TCP / UDP Socket**
- https://docs.python.org/3/library/socket.html
- https://inpa.tistory.com/entry/NW-%F0%9F%8C%90-%EC%95%84%EC%A7%81%EB%8F%84-%EB%AA%A8%ED%98%B8%ED%95%9C-TCP-UDP-%EA%B0%9C%EB%85%90-%E2%9D%93-%EC%89%BD%EA%B2%8C-%EC%9D%B4%ED%95%B4%ED%95%98%EC%9E%90

**gRPC Streaming**
- https://grpc.io/docs/what-is-grpc/core-concepts/
- https://tech.ktcloud.com/entry/gRPC%EC%9D%98-%EB%82%B4%EB%B6%80-%EA%B5%AC%EC%A1%B0-%ED%8C%8C%ED%97%A4%EC%B9%98%EA%B8%B0-HTTP2-Protobuf-%EA%B7%B8%EB%A6%AC%EA%B3%A0-%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%B0%8D
- https://tech.ktcloud.com/entry/gRPC%EC%9D%98-%EB%82%B4%EB%B6%80-%EA%B5%AC%EC%A1%B0-%ED%8C%8C%ED%97%A4%EC%B9%98%EA%B8%B02-Channel-Stub
- https://inspirit941.tistory.com/371
- https://devocean.sk.com/blog/techBoardDetail.do?ID=167433

**WebRTC**
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- https://webrtc.org/getting-started/overview
- https://web.dev/articles/webrtc-basics?hl=ko
- https://devocean.sk.com/blog/techBoardDetail.do?ID=164885
- https://beomkey-nkb.github.io/%EA%B0%9C%EB%85%90%EC%A0%95%EB%A6%AC/webRTC%EC%A0%95%EB%A6%AC/
- https://gh402.tistory.com/45
- https://on.com2us.com/tech/webrtc-coturn-turn-stun-server-setup-guide/

**QUIC / WebTransport**
- https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API
- https://datatracker.ietf.org/doc/html/rfc9000
- https://news.hada.io/topic?id=13888

#### KCLOUD VM / Cloudflare Tunnel 환경별 주의사항

| 환경 | 사용 가능(권장) 기술 | 포트/조건 | 주의할 기술 |
|---|---|---|---|
| **로컬 / 일반 VM** | HTTP/REST, WebSocket, Socket.IO, SSE, TCP Socket, gRPC Streaming, WebRTC, QUIC/WebTransport 등 대부분 가능 | 직접 포트 개방 가능. 예: 3000, 5000, 8000, 8080, 9000 등. 외부 공개 시 방화벽/보안그룹/공인 IP 설정 필요 | WebRTC는 STUN/TURN 필요 가능. QUIC/WebTransport는 HTTP/3 · UDP 지원 필요 |
| **KCLOUD VM (VPN 내부)** | HTTP/REST, WebSocket, Socket.IO, SSE, WebRTC 시그널링 | 접속 기기 VPN 필요. 기본 허용 포트: **22, 80, 443**. 개발 포트(3000, 8000, 8080 등)는 직접 접근 제한 가능 | TCP Socket은 포트 제한 있음. gRPC는 HTTP/2 설정 필요. WebRTC 미디어·UDP·QUIC/WebTransport 비권장 |
| **KCLOUD VM + Tunnel** | HTTP/REST, WebSocket, Socket.IO, SSE, WebRTC 시그널링 | VM의 `localhost:<port>`를 도메인에 연결. `localPort`는 **1024~65535**. 예: 3000, 8000, 8080 가능 | 순수 TCP Socket, UDP, WebRTC 미디어/DataChannel, QUIC/WebTransport 불가. gRPC 보장 어려움 |
| **외부 서비스 + 우리 도메인** | HTTP/REST, WebSocket, Socket.IO, SSE, WebRTC 시그널링 | Vercel/Netlify/Railway/Render/AWS/GCP 등에 배포 후 CNAME/A 레코드 연결. 보통 외부는 **443** 사용 | WebSocket/gRPC/TCP/UDP는 플랫폼 지원 여부 확인 필요. 서버리스 플랫폼은 장시간 연결 제한 가능 |
| **서버 없이 외부 SaaS 사용** | Supabase Realtime, Firebase, Pusher/Ably, LLM API Streaming | 직접 포트 관리 불필요. 각 서비스 SDK/API 사용 | 커스텀 TCP/UDP 서버 구현 불가. WebRTC는 STUN/TURN 필요할 수 있음 |

### LLM Wrapper

- https://github.com/teddylee777/openai-api-kr
- https://github.com/teddylee777/langchain-kr
- https://devocean.sk.com/blog/techBoardDetail.do?ID=167407
- https://mastra.ai/docs

### Cross-Platform

- https://flutter.dev/
- https://reactnative.dev/
- https://docs.expo.dev/
- https://kotlinlang.org/multiplatform/

# docs

공동 설계 문서 (API 명세, 데이터 스키마 등). README.md의 "설계 문서" 섹션과 함께 최신 상태로 유지하세요.

- `api-spec.md` — API 요청/응답 명세 (프론트-백엔드 공동 정의)
- `data-schema.md` — 채용공고/프로젝트/매칭 결과 등 데이터 구조 정의

