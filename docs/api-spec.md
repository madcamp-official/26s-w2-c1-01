# API 명세

> 목적: 프론트엔드와 백엔드가 주고받을 데이터 형식을 미리 합의하기 위한 문서입니다.
실제 구현 과정에서 endpoint 이름이나 필드는 변경될 수 있습니다.
> 

## 1. 공통 규칙

### Base URL

개발 환경에서는 아래 주소를 기본값으로 사용합니다.

```
http://localhost:8080
```

### 인증 방식

GitHub 로그인 이후 백엔드는 자체 서비스용 access token을 발급합니다.
인증이 필요한 API는 아래 헤더를 포함합니다.

```
Authorization: Bearer {accessToken}
```

### 작업 상태값

GitHub 수집, 공고 분석, 이력서 생성처럼 시간이 걸리는 작업은 아래 상태값을 사용합니다.

| status | 의미 |
| --- | --- |
| `pending` | 작업 생성됨 |
| `running` | 작업 진행 중 |
| `completed` | 작업 완료 |
| `failed` | 작업 실패 |

### 공통 에러 응답

```json
{
  "status": "failed",
  "message": "사용자에게 보여줄 수 있는 에러 메시지입니다.",
  "error": {
    "code": "ERROR_CODE",
    "detail": "개발자가 확인할 상세 메시지입니다."
  }
}
```

### 공통 작업 응답

```json
{
  "jobId": 1,
  "status": "running",
  "message": "작업을 진행하고 있습니다.",
  "resultId": null,
  "error": null
}
```

---

## 2. GitHub 로그인 시작

GitHub OAuth 로그인을 시작합니다.

- Method: `GET`
- URL: `/auth/github/login`
- 인증: 필요 없음

### Response

백엔드는 GitHub 로그인 페이지로 redirect합니다.

```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=..."
}
```

### 비고

실제 구현에서는 JSON을 반환하지 않고 바로 redirect할 수도 있습니다.
프론트 구현 방식에 따라 redirect 방식 또는 URL 반환 방식 중 하나를 선택합니다.

---

## 3. GitHub 로그인 콜백

GitHub 로그인 완료 후 호출되는 callback API입니다.

- Method: `GET`
- URL: `/auth/github/callback`
- 인증: 필요 없음

### Query Parameters

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `code` | string | yes | GitHub OAuth code |

### Response

```json
{
  "accessToken": "service-access-token",
  "user": {
    "id": 1,
    "githubId": "terry2549",
    "name": "김태현",
    "avatarUrl": "https://github.com/terry2549.png"
  }
}
```

---

## 4. 내 정보 조회

현재 로그인한 사용자 정보를 조회합니다.

- Method: `GET`
- URL: `/me`
- 인증: 필요

### Response

```json
{
  "id": 1,
  "githubId": "terry2549",
  "name": "김태현",
  "avatarUrl": "https://github.com/terry2549.png"
}
```

---

## 5. GitHub 프로젝트 수집 시작

사용자가 “분석에 대한 동의” 버튼을 누른 뒤 호출합니다.
백엔드는 사용자의 GitHub repository와 README를 수집하고 프로젝트 후보를 생성합니다.

- Method: `POST`
- URL: `/github/collection-jobs`
- 인증: 필요

### Request

```json
{
  "agreedToAnalyze": true
}
```

### Response

```json
{
  "jobId": 101,
  "status": "pending",
  "message": "GitHub 프로젝트 수집 작업이 생성되었습니다.",
  "resultId": null,
  "error": null
}
```

### Error Response

```json
{
  "status": "failed",
  "message": "GitHub 분석 동의가 필요합니다.",
  "error": {
    "code": "ANALYSIS_CONSENT_REQUIRED",
    "detail": "agreedToAnalyze must be true."
  }
}
```

---

## 6. GitHub 프로젝트 수집 상태 조회

GitHub 프로젝트 수집 작업의 진행 상태를 조회합니다.

- Method: `GET`
- URL: `/github/collection-jobs/{jobId}`
- 인증: 필요

### Response: 진행 중

```json
{
  "jobId": 101,
  "status": "running",
  "message": "GitHub repository와 README를 수집하고 있습니다.",
  "resultId": null,
  "error": null
}
```

### Response: 완료

```json
{
  "jobId": 101,
  "status": "completed",
  "message": "GitHub 프로젝트 수집이 완료되었습니다.",
  "resultId": null,
  "error": null,
  "projects": [
    {
      "projectId": 1,
      "title": "쇼핑몰 백엔드 프로젝트",
      "description": "Spring Boot 기반 쇼핑몰 API 서버",
      "skills": ["Spring Boot", "MySQL"],
      "sourceType": "github",
      "sourceUrl": "https://github.com/example/shop-server"
    }
  ]
}
```

---

## 7. 프로젝트 목록 조회

로그인한 사용자의 프로젝트 목록을 조회합니다.

- Method: `GET`
- URL: `/projects`
- 인증: 필요

### Response

```json
{
  "projects": [
    {
      "projectId": 1,
      "title": "쇼핑몰 백엔드 프로젝트",
      "description": "Spring Boot 기반 쇼핑몰 API 서버",
      "role": "백엔드 개발",
      "skills": ["Spring Boot", "MySQL", "JPA"],
      "achievements": ["주문 API 구현", "상품 검색 기능 구현"],
      "sourceType": "github",
      "sourceUrl": "https://github.com/example/shop-server",
      "evidenceIds": [1001, 1002]
    }
  ]
}
```

---

## 8. 프로젝트 수정

사용자가 프로젝트 제목, 설명, 역할, 기술, 성과 등을 수정합니다.

- Method: `PATCH`
- URL: `/projects/{projectId}`
- 인증: 필요

### Request

```json
{
  "title": "쇼핑몰 백엔드 API 서버",
  "description": "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현한 프로젝트",
  "role": "백엔드 개발",
  "skills": ["Spring Boot", "MySQL", "JPA", "Docker"],
  "achievements": ["주문 API 구현", "Docker 기반 실행 환경 구성"]
}
```

### Response

```json
{
  "projectId": 1,
  "title": "쇼핑몰 백엔드 API 서버",
  "description": "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현한 프로젝트",
  "role": "백엔드 개발",
  "skills": ["Spring Boot", "MySQL", "JPA", "Docker"],
  "achievements": ["주문 API 구현", "Docker 기반 실행 환경 구성"],
  "updatedAt": "2026-07-10T16:00:00+09:00"
}
```

---

## 9. 채용공고 등록

채용공고 URL 또는 직접 입력 텍스트를 등록합니다.
URL 인식에 실패하면 프론트는 텍스트 입력 화면을 보여줍니다.

- Method: `POST`
- URL: `/job-postings`
- 인증: 필요

### Request: URL 입력

```json
{
  "inputType": "url",
  "content": "https://example.com/jobs/backend"
}
```

### Request: 텍스트 직접 입력

```json
{
  "inputType": "text",
  "content": "백엔드 개발자 채용공고 원문입니다..."
}
```

### Response

```json
{
  "jobPostingId": 201,
  "inputType": "url",
  "rawText": "백엔드 개발자 채용공고 원문입니다...",
  "status": "completed"
}
```

### Error Response: URL 인식 실패

```json
{
  "status": "failed",
  "message": "채용공고 URL을 읽을 수 없습니다. 공고 내용을 직접 입력해주세요.",
  "error": {
    "code": "JOB_POSTING_URL_FETCH_FAILED",
    "detail": "The server could not extract text from the given URL."
  }
}
```

---

## 10. 공고 분석 시작

등록된 채용공고를 분석하고, 사용자의 프로젝트 중 추천 프로젝트 3개를 선정합니다.

- Method: `POST`
- URL: `/job-postings/{jobPostingId}/analysis-jobs`
- 인증: 필요

### Request

```json
{
  "recommendationLimit": 3
}
```

### Response

```json
{
  "jobId": 301,
  "status": "pending",
  "message": "채용공고 분석 작업이 생성되었습니다.",
  "resultId": null,
  "error": null
}
```

---

## 11. 공고 분석 상태 및 결과 조회

공고 분석 작업의 진행 상태를 조회합니다.
완료되면 구조화된 공고 정보와 추천 프로젝트 3개를 반환합니다.

- Method: `GET`
- URL: `/analysis-jobs/{jobId}`
- 인증: 필요

### Response: 진행 중

```json
{
  "jobId": 301,
  "status": "running",
  "message": "채용공고와 프로젝트를 비교하고 있습니다.",
  "resultId": null,
  "error": null
}
```

### Response: 완료

```json
{
  "jobId": 301,
  "status": "completed",
  "message": "채용공고 분석이 완료되었습니다.",
  "resultId": 401,
  "error": null,
  "jobPosting": {
    "jobPostingId": 201,
    "companyName": "예시회사",
    "role": "Backend Developer",
    "requiredSkills": ["Spring Boot", "MySQL"],
    "preferredSkills": ["Docker", "AWS"],
    "competencies": ["문제 해결", "협업"]
  },
  "recommendedProjects": [
    {
      "projectId": 1,
      "title": "쇼핑몰 백엔드 API 서버",
      "score": 91,
      "reason": "Spring Boot와 MySQL 경험이 공고의 필수 기술과 잘 맞습니다.",
      "matchedSkills": ["Spring Boot", "MySQL"],
      "missingSkills": ["AWS"],
      "evidenceIds": [1001, 1002]
    },
    {
      "projectId": 2,
      "title": "실시간 채팅 서버",
      "score": 84,
      "reason": "백엔드 API 설계와 서버 운영 경험을 보여줄 수 있습니다.",
      "matchedSkills": ["WebSocket", "Redis"],
      "missingSkills": ["Spring Boot"],
      "evidenceIds": [1003]
    },
    {
      "projectId": 3,
      "title": "게시판 REST API",
      "score": 78,
      "reason": "REST API 설계 경험이 직무 요구사항과 일부 연결됩니다.",
      "matchedSkills": ["REST API", "MySQL"],
      "missingSkills": ["Docker", "AWS"],
      "evidenceIds": [1004]
    }
  ]
}
```

---

## 12. 이력서 생성 시작

사용자가 선택한 프로젝트를 기반으로 전체 이력서 초안을 생성합니다.

- Method: `POST`
- URL: `/resume-jobs`
- 인증: 필요

### Request

```json
{
  "jobPostingId": 201,
  "projectIds": [1, 2, 3]
}
```

### Response

```json
{
  "jobId": 501,
  "status": "pending",
  "message": "이력서 초안 생성 작업이 생성되었습니다.",
  "resultId": null,
  "error": null
}
```

### Error Response

```json
{
  "status": "failed",
  "message": "이력서 생성에 사용할 프로젝트를 1개 이상 선택해주세요.",
  "error": {
    "code": "PROJECT_SELECTION_REQUIRED",
    "detail": "projectIds must contain at least one project id."
  }
}
```

---

## 13. 이력서 생성 상태 조회

이력서 생성 작업의 진행 상태를 조회합니다.
완료되면 resumeResultId를 반환합니다.

- Method: `GET`
- URL: `/resume-jobs/{jobId}`
- 인증: 필요

### Response: 진행 중

```json
{
  "jobId": 501,
  "status": "running",
  "message": "선택한 프로젝트를 기반으로 이력서 초안을 작성하고 있습니다.",
  "resultId": null,
  "error": null
}
```

### Response: 완료

```json
{
  "jobId": 501,
  "status": "completed",
  "message": "이력서 초안 생성이 완료되었습니다.",
  "resultId": 601,
  "error": null
}
```

---

## 14. 이력서 결과 조회

생성된 전체 이력서 초안을 조회합니다.

- Method: `GET`
- URL: `/resume-results/{resumeResultId}`
- 인증: 필요

### Response

```json
{
  "resumeResultId": 601,
  "jobPostingId": 201,
  "title": "Backend Developer 지원 이력서 초안",
  "summary": "Spring Boot와 MySQL 기반 백엔드 API 개발 경험을 중심으로 구성한 이력서 초안입니다.",
  "sections": [
    {
      "sectionType": "profile_summary",
      "heading": "요약",
      "content": "Spring Boot 기반 API 서버 개발과 MySQL 데이터 모델링 경험을 보유한 백엔드 개발자입니다.",
      "evidenceIds": [1001, 1002]
    },
    {
      "sectionType": "skills",
      "heading": "기술 스택",
      "content": "Spring Boot, MySQL, JPA, Docker",
      "evidenceIds": [1001, 1002]
    },
    {
      "sectionType": "project",
      "heading": "쇼핑몰 백엔드 API 서버",
      "content": "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현했습니다. 공고의 필수 기술인 Spring Boot와 MySQL 경험을 직접적으로 보여줄 수 있는 프로젝트입니다.",
      "projectId": 1,
      "evidenceIds": [1001, 1002]
    }
  ],
  "missingSkills": ["AWS"],
  "suggestedProjects": [
    {
      "title": "Spring Boot 애플리케이션 AWS 배포 프로젝트",
      "description": "기존 Spring Boot 프로젝트를 Docker 이미지로 만들고 AWS EC2에 배포하는 프로젝트입니다.",
      "targetSkills": ["AWS", "Docker"],
      "estimatedDuration": "3~5일",
      "reason": "공고에서 AWS 경험을 우대하지만 기존 프로젝트 근거에서 AWS 사용 경험이 확인되지 않았습니다."
    }
  ],
  "warnings": [
    "성과 수치가 확인되지 않아 정량적 성과 문장은 생성하지 않았습니다."
  ],
  "createdAt": "2026-07-10T16:30:00+09:00"
}
```

---

## 15. 근거 조회

추천 프로젝트, 이력서 문장, 부족 역량 판단에 사용된 원문 근거를 조회합니다.

- Method: `GET`
- URL: `/evidences/{evidenceId}`
- 인증: 필요

### Response

```json
{
  "evidenceId": 1001,
  "sourceType": "github",
  "sourceUrl": "https://github.com/example/shop-server",
  "title": "README.md",
  "content": "Spring Boot와 MySQL을 사용한 쇼핑몰 백엔드 API 서버입니다.",
  "projectId": 1
}
```

---

## 16. 주요 에러 코드

| code | 설명 |
| --- | --- |
| `UNAUTHORIZED` | 인증되지 않은 요청 |
| `ANALYSIS_CONSENT_REQUIRED` | 분석 동의가 필요함 |
| `GITHUB_TOKEN_EXPIRED` | GitHub token 만료 |
| `GITHUB_REPOSITORY_FETCH_FAILED` | GitHub repository 수집 실패 |
| `JOB_POSTING_URL_FETCH_FAILED` | 채용공고 URL 본문 추출 실패 |
| `JOB_POSTING_TEXT_REQUIRED` | 채용공고 텍스트가 필요함 |
| `PROJECT_NOT_FOUND` | 프로젝트를 찾을 수 없음 |
| `PROJECT_SELECTION_REQUIRED` | 이력서 생성에 사용할 프로젝트가 선택되지 않음 |
| `LLM_TIMEOUT` | LLM 응답 시간 초과 |
| `LLM_RESPONSE_PARSE_FAILED` | LLM 응답 JSON 파싱 실패 |
| `INTERNAL_SERVER_ERROR` | 서버 내부 오류 |

---

## 17. 프론트엔드 화면별 API 사용 흐름

### 로그인 화면

```
GET /auth/github/login
GET /auth/github/callback
GET /me
```

### 분석 동의 화면

```
POST /github/collection-jobs
GET /github/collection-jobs/{jobId}
```

### 프로젝트 목록/수정 화면

```
GET /projects
PATCH /projects/{projectId}
```

### 채용공고 입력 화면

```
POST /job-postings
```

### 공고 분석 로딩/결과 화면

```
POST /job-postings/{jobPostingId}/analysis-jobs
GET /analysis-jobs/{jobId}
GET /evidences/{evidenceId}
```

### 이력서 생성 화면

```
POST /resume-jobs
GET /resume-jobs/{jobId}
GET /resume-results/{resumeResultId}
GET /evidences/{evidenceId}
```
