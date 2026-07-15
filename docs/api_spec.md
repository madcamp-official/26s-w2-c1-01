# API Specification

> 기준 코드: `backend/app/routers/*.py`, `frontend/src/api/*.ts`  
> 갱신일: 2026-07-15

## 1. 공통 규칙

### Base URL

```text
http://localhost:8000
```

### 인증

GitHub OAuth callback 이후 백엔드가 자체 access token을 발급한다. 인증이 필요한 API는 다음 헤더를 사용한다.

```http
Authorization: Bearer {accessToken}
```

### 공통 작업 응답

GitHub 수집, 공고 분석, 이력서 생성은 `async_jobs` 기반의 같은 응답 형태를 사용한다.

```json
{
  "jobId": 1,
  "status": "running",
  "message": "Analysis job queued.",
  "resultId": null,
  "error": null
}
```

`error`가 있는 경우:

```json
{
  "jobId": 1,
  "status": "failed",
  "message": "Job failed.",
  "resultId": null,
  "error": {
    "code": "ERROR_CODE",
    "detail": "Human-readable detail"
  }
}
```

현재 코드에서 주로 쓰는 상태값은 `running`, `completed`, `failed`다.

## 2. Auth

### `GET /auth/github/login`

GitHub OAuth 로그인 URL을 반환한다.

인증: 필요 없음

Response:

```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=..."
}
```

### `GET /auth/github/callback`

GitHub OAuth code를 받아 사용자와 OAuth 계정을 생성/갱신하고 서비스 access token을 반환한다.

인증: 필요 없음

Query:

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `code` | string | yes | GitHub OAuth code |

Response:

```json
{
  "accessToken": "service-access-token",
  "user": {
    "id": 1,
    "githubId": "octocat",
    "name": "Octocat",
    "avatarUrl": "https://github.com/images/error/octocat_happy.gif"
  }
}
```

### `GET /me`

현재 로그인한 사용자 정보를 조회한다.

인증: 필요

Response:

```json
{
  "id": 1,
  "githubId": "octocat",
  "name": "Octocat",
  "avatarUrl": "https://github.com/images/error/octocat_happy.gif"
}
```

## 3. GitHub Portfolio Collection

### `POST /github/collection-jobs`

로그인 사용자의 GitHub 저장소와 README를 수집해 프로젝트/근거를 만든다. 현재 구현은 요청 중 수집을 수행한 뒤 완료된 작업을 반환할 수 있다.

인증: 필요

Request:

```json
{
  "agreedToAnalyze": true
}
```

Response:

```json
{
  "jobId": 101,
  "status": "completed",
  "message": "GitHub project collection completed.",
  "resultId": null,
  "error": null
}
```

주요 에러:

| code | 설명 |
|---|---|
| `ANALYSIS_CONSENT_REQUIRED` | `agreedToAnalyze`가 `true`가 아님 |
| `GITHUB_TOKEN_EXPIRED` | 저장된 GitHub token 복호화/사용 실패 |
| `GITHUB_REPOSITORY_FETCH_FAILED` | GitHub 저장소 조회 실패 |

### `GET /github/collection-jobs/{jobId}`

GitHub 수집 작업 상태를 조회한다. 완료된 경우 수집된 프로젝트 목록을 포함한다.

인증: 필요

Response:

```json
{
  "jobId": 101,
  "status": "completed",
  "message": "GitHub project collection completed.",
  "resultId": null,
  "error": null,
  "projects": [
    {
      "projectId": 1,
      "title": "resume-fit",
      "description": "Job posting matcher",
      "role": "Backend Developer",
      "skills": ["Python", "FastAPI"],
      "achievements": [],
      "sourceType": "github",
      "sourceUrl": "https://github.com/example/resume-fit"
    }
  ]
}
```

### `POST /github/repositories`

특정 GitHub 저장소를 수동으로 추가한다. 조직 저장소처럼 자동 수집 목록에 없을 수 있는 repo를 추가할 때 사용한다.

인증: 필요

Request:

```json
{
  "fullName": "owner/repo"
}
```

Response:

```json
{
  "projectId": 2,
  "title": "repo",
  "description": "Project description",
  "role": "Backend Developer",
  "skills": ["TypeScript"],
  "achievements": ["Implemented API"],
  "sourceType": "github_manual",
  "sourceUrl": "https://github.com/owner/repo",
  "evidenceIds": [10]
}
```

## 4. Projects

### `GET /projects`

로그인 사용자의 활성 프로젝트 목록을 조회한다.

인증: 필요

Response:

```json
{
  "projects": [
    {
      "projectId": 1,
      "title": "resume-fit",
      "description": "Job posting matcher",
      "role": "Backend Developer",
      "skills": ["Python", "FastAPI"],
      "achievements": ["Built recommendation API"],
      "sourceType": "github",
      "sourceUrl": "https://github.com/example/resume-fit",
      "evidenceIds": [1001, 1002]
    }
  ]
}
```

### `PATCH /projects/{projectId}`

프로젝트 제목, 설명, 역할, 기술, 성과를 수정한다.

인증: 필요

Request:

```json
{
  "title": "resume-fit backend",
  "description": "FastAPI 기반 채용공고-프로젝트 매칭 서버",
  "role": "Backend Developer",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "achievements": ["Implemented hybrid recommendation"]
}
```

Response:

```json
{
  "projectId": 1,
  "title": "resume-fit backend",
  "description": "FastAPI 기반 채용공고-프로젝트 매칭 서버",
  "role": "Backend Developer",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "achievements": ["Implemented hybrid recommendation"],
  "updatedAt": "2026-07-15T10:00:00+09:00"
}
```

## 5. Job Postings

### `POST /job-postings`

채용공고를 URL, 텍스트, 이미지 중 하나로 등록한다. 등록 시 LLM/폴백 로직으로 요구 기술과 역량을 구조화하고, 가능하면 임베딩을 생성한다.

인증: 필요

지원 input type:

| `inputType` | `content` 타입 | 설명 |
|---|---|---|
| `url` | string | HTML 페이지에서 텍스트를 추출. 텍스트가 부족하면 이미지 후보 OCR/비전 분석 시도 |
| `text` | string | 사용자가 붙여 넣은 공고 원문 |
| `image` | string 또는 string[] | `data:image/...;base64,...` 형식. 최대 6개 |

Request:

```json
{
  "inputType": "text",
  "content": "Backend Developer 채용공고 원문..."
}
```

Response:

```json
{
  "jobPostingId": 201,
  "inputType": "text",
  "rawText": "Backend Developer 채용공고 원문...",
  "status": "completed"
}
```

주요 에러:

| code | 설명 |
|---|---|
| `JOB_POSTING_URL_FETCH_FAILED` | URL 본문 추출 실패 |
| `JOB_POSTING_URL_INSUFFICIENT` | URL에서 충분한 요구사항을 구조화하지 못함 |
| `JOB_POSTING_TEXT_REQUIRED` | content가 비어 있거나 타입이 맞지 않음 |
| `JOB_POSTING_IMAGE_INVALID` | 이미지 data URL 형식/타입/크기 오류 |
| `JOB_POSTING_IMAGE_OCR_FAILED` | 이미지에서 읽을 수 있는 공고 텍스트 추출 실패 |

## 6. Analysis

### `POST /job-postings/{jobPostingId}/analysis-jobs`

채용공고와 사용자의 프로젝트/CV를 비교해 추천 프로젝트와 CV 적합도를 생성하는 작업을 시작한다.

인증: 필요

Request:

```json
{
  "recommendationLimit": 3
}
```

Response:

```json
{
  "jobId": 301,
  "status": "running",
  "message": "Analysis job queued.",
  "resultId": null,
  "error": null
}
```

### `GET /analysis-jobs/{jobId}`

공고 분석 작업 상태와 결과를 조회한다. 완료 전에는 공통 작업 응답만 반환하고, 완료 후에는 공고 구조화 결과, 추천 프로젝트, CV 적합도를 포함한다.

인증: 필요

Response:

```json
{
  "jobId": 301,
  "status": "completed",
  "message": "Job posting analysis completed.",
  "resultId": 401,
  "error": null,
  "jobPosting": {
    "jobPostingId": 201,
    "companyName": null,
    "role": "Backend Developer",
    "requiredSkills": ["Python", "PostgreSQL"],
    "preferredSkills": ["Docker"],
    "competencies": ["Problem solving"]
  },
  "recommendedProjects": [
    {
      "projectId": 1,
      "title": "resume-fit",
      "score": 91,
      "reason": "The project matches required backend and database experience.",
      "matchedSkills": ["Python", "PostgreSQL"],
      "missingSkills": ["Docker"],
      "matchEvidence": [
        {
          "requirement": "Python",
          "matchType": "skill",
          "source": "Project summary",
          "projectEvidence": "FastAPI backend...",
          "explanation": "The job posting requires Python, and this project provides matching evidence."
        }
      ],
      "evidenceIds": [1001]
    }
  ],
  "cvFit": {
    "score": 82,
    "summary": "CV 전체에서 공고 요구사항과 직접 맞닿는 경험을 확인했습니다.",
    "matchedSkills": ["Python"],
    "missingSkills": ["Docker"],
    "sectionEvidence": [
      {
        "sectionType": "projects",
        "title": "Projects",
        "matchedSkills": ["Python"],
        "content": "..."
      }
    ],
    "ruleScore": 75,
    "vectorScore": 89
  }
}
```

## 7. CVs

### `GET /cvs`

사용자가 업로드한 CV 문서와 섹션 목록을 조회한다.

인증: 필요

Response:

```json
{
  "cvs": [
    {
      "cvId": 1,
      "fileName": "resume.pdf",
      "status": "ready",
      "createdAt": "2026-07-15T10:00:00+09:00",
      "updatedAt": "2026-07-15T10:00:00+09:00",
      "sections": [
        {
          "sectionId": 11,
          "sectionType": "projects",
          "title": "Projects",
          "content": "Project descriptions...",
          "sortOrder": 3
        }
      ]
    }
  ]
}
```

### `POST /cvs/upload`

CV PDF를 업로드한다. 같은 파일명으로 이미 업로드된 CV가 있으면 기존 문서, CV 기반 프로젝트, CV 근거를 삭제한 뒤 새 문서로 교체한다.

인증: 필요

Content-Type: `multipart/form-data`

Form fields:

| 이름 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `file` | PDF file | yes | `application/pdf` 또는 `application/x-pdf` |

Response: `GET /cvs`의 단일 CV 문서 객체와 동일

### `PATCH /cvs/sections/{sectionId}`

CV 섹션 제목/본문을 수정한다. 수정 후 해당 CV에서 파생된 프로젝트와 근거를 다시 동기화하고 CV 임베딩 캐시를 무효화한다.

인증: 필요

Request:

```json
{
  "title": "Projects",
  "content": "Updated project description"
}
```

Response:

```json
{
  "sectionId": 11,
  "sectionType": "projects",
  "title": "Projects",
  "content": "Updated project description",
  "sortOrder": 3
}
```

### `DELETE /cvs/{cvId}`

CV 문서, 섹션, 업로드 파일, CV 기반 프로젝트와 근거를 삭제한다.

인증: 필요

Response:

```json
{
  "deleted": true
}
```

## 8. Resume Drafts

### `POST /resume-jobs`

선택한 프로젝트로 이력서 초안 생성 작업을 시작한다. 같은 공고와 같은 프로젝트 순서로 이미 생성된 결과가 있으면 기존 작업을 재사용할 수 있다.

인증: 필요

Request:

```json
{
  "jobPostingId": 201,
  "projectIds": [1, 2, 3]
}
```

Response:

```json
{
  "jobId": 501,
  "status": "running",
  "message": "Resume draft generation queued.",
  "resultId": null,
  "error": null
}
```

### `GET /resume-jobs/{jobId}`

이력서 생성 작업 상태를 조회한다.

인증: 필요

Response:

```json
{
  "jobId": 501,
  "status": "completed",
  "message": "Resume draft generation completed.",
  "resultId": 601,
  "error": null
}
```

### `GET /resume-results/{resumeResultId}`

생성된 이력서 초안을 조회한다.

인증: 필요

Response:

```json
{
  "resumeResultId": 601,
  "jobPostingId": 201,
  "title": "Backend Developer resume draft",
  "summary": "Resume draft focused on Backend Developer.",
  "sections": [
    {
      "sectionType": "profile_summary",
      "heading": "Summary",
      "content": "Backend developer with FastAPI experience.",
      "evidenceIds": [1001]
    },
    {
      "sectionType": "project",
      "heading": "resume-fit",
      "content": "Built recommendation API.",
      "projectId": 1,
      "evidenceIds": [1001]
    }
  ],
  "missingSkills": ["Docker"],
  "suggestedProjects": [
    {
      "title": "Docker deployment project",
      "description": "Containerize and deploy an existing backend service.",
      "targetSkills": ["Docker"],
      "estimatedDuration": null,
      "reason": "Docker evidence was not found in selected projects."
    }
  ],
  "warnings": ["Some required skills were not found in the selected projects."],
  "createdAt": "2026-07-15T10:30:00+09:00"
}
```

## 9. Evidences

### `GET /evidences/{evidenceId}`

추천 프로젝트, 이력서 섹션, CV 기반 프로젝트 등에 쓰인 원문 근거를 조회한다. 근거가 현재 사용자 소유 프로젝트 또는 채용공고에 연결되어 있어야 한다.

인증: 필요

Response:

```json
{
  "evidenceId": 1001,
  "sourceType": "github",
  "sourceUrl": "https://github.com/example/resume-fit",
  "title": "example/resume-fit README",
  "content": "FastAPI backend...",
  "projectId": 1
}
```

## 10. 현재 라우트 목록

```text
GET    /
GET    /auth/github/login
GET    /auth/github/callback
GET    /me
POST   /github/collection-jobs
GET    /github/collection-jobs/{jobId}
POST   /github/repositories
GET    /projects
PATCH  /projects/{projectId}
POST   /job-postings
POST   /job-postings/{jobPostingId}/analysis-jobs
GET    /analysis-jobs/{jobId}
GET    /cvs
POST   /cvs/upload
PATCH  /cvs/sections/{sectionId}
DELETE /cvs/{cvId}
POST   /resume-jobs
GET    /resume-jobs/{jobId}
GET    /resume-results/{resumeResultId}
GET    /evidences/{evidenceId}
```

디버그 모드(`is_debug_enabled()`)가 켜진 경우에만 다음 라우트가 추가된다.

```text
GET  /debug/github/repo-access
POST /debug/github/snapshot
```
