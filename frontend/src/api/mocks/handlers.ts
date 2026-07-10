import { http, HttpResponse } from "msw";
import {
  MOCK_ACCESS_TOKEN,
  createJob,
  currentUser,
  evidences,
  jobPostings,
  nextJobPostingIdValue,
  nextResumeResultIdValue,
  pollJob,
  projects,
  resumeResults,
} from "./db";

// docs/api-spec.md 의 Base URL
const BASE_URL = "http://localhost:8080";

function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${MOCK_ACCESS_TOKEN}`) {
    return HttpResponse.json(
      {
        status: "failed",
        message: "로그인이 필요합니다.",
        error: { code: "UNAUTHORIZED", detail: "Authorization header missing or invalid." },
      },
      { status: 401 },
    );
  }
  return null;
}

export const handlers = [
  // 2. GitHub 로그인 시작
  http.get(`${BASE_URL}/auth/github/login`, () => {
    return HttpResponse.json({
      redirectUrl: "https://github.com/login/oauth/authorize?client_id=mock-client-id",
    });
  }),

  // 3. GitHub 로그인 콜백
  http.get(`${BASE_URL}/auth/github/callback`, ({ request }) => {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "GitHub 인증 코드가 없습니다.",
          error: { code: "UNAUTHORIZED", detail: "code query parameter is required." },
        },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      accessToken: MOCK_ACCESS_TOKEN,
      user: currentUser,
    });
  }),

  // 4. 내 정보 조회
  http.get(`${BASE_URL}/me`, ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
    return HttpResponse.json(currentUser);
  }),

  // 5. GitHub 프로젝트 수집 시작
  http.post(`${BASE_URL}/github/collection-jobs`, async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const body = (await request.json()) as { agreedToAnalyze?: boolean };
    if (!body.agreedToAnalyze) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "GitHub 분석 동의가 필요합니다.",
          error: { code: "ANALYSIS_CONSENT_REQUIRED", detail: "agreedToAnalyze must be true." },
        },
        { status: 400 },
      );
    }

    const job = createJob("github-collection");
    return HttpResponse.json({
      jobId: job.jobId,
      status: job.status,
      message: "GitHub 프로젝트 수집 작업이 생성되었습니다.",
      resultId: null,
      error: null,
    });
  }),

  // 6. GitHub 프로젝트 수집 상태 조회
  http.get(`${BASE_URL}/github/collection-jobs/:jobId`, ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const job = pollJob(Number(params.jobId));
    if (!job) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "작업을 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "job not found" },
        },
        { status: 404 },
      );
    }

    if (job.status !== "completed") {
      return HttpResponse.json({
        jobId: job.jobId,
        status: job.status,
        message: "GitHub repository와 README를 수집하고 있습니다.",
        resultId: null,
        error: null,
      });
    }

    return HttpResponse.json({
      jobId: job.jobId,
      status: "completed",
      message: "GitHub 프로젝트 수집이 완료되었습니다.",
      resultId: null,
      error: null,
      projects,
    });
  }),

  // 7. 프로젝트 목록 조회
  http.get(`${BASE_URL}/projects`, ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;
    return HttpResponse.json({ projects });
  }),

  // 8. 프로젝트 수정
  http.patch(`${BASE_URL}/projects/:projectId`, async ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const project = projects.find((p) => p.projectId === Number(params.projectId));
    if (!project) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "프로젝트를 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "project not found" },
        },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Partial<typeof project>;
    Object.assign(project, body);

    return HttpResponse.json({ ...project, updatedAt: new Date().toISOString() });
  }),

  // 9. 채용공고 등록
  http.post(`${BASE_URL}/job-postings`, async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const body = (await request.json()) as { inputType: "url" | "text"; content: string };

    // "fail"이 포함된 URL을 넣으면 URL 인식 실패 케이스를 재현합니다.
    if (body.inputType === "url" && body.content.includes("fail")) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "채용공고 URL을 읽을 수 없습니다. 공고 내용을 직접 입력해주세요.",
          error: {
            code: "JOB_POSTING_URL_FETCH_FAILED",
            detail: "The server could not extract text from the given URL.",
          },
        },
        { status: 422 },
      );
    }

    const jobPostingId = nextJobPostingIdValue();
    const rawText =
      body.inputType === "url"
        ? "백엔드 개발자 채용공고 원문입니다... (mock)"
        : body.content;

    jobPostings[jobPostingId] = {
      jobPostingId,
      inputType: body.inputType,
      rawText,
      status: "completed",
    };

    return HttpResponse.json(jobPostings[jobPostingId]);
  }),

  // 10. 공고 분석 시작
  http.post(`${BASE_URL}/job-postings/:jobPostingId/analysis-jobs`, async ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const jobPostingId = Number(params.jobPostingId);
    const body = (await request.json()) as { recommendationLimit?: number };
    const job = createJob("job-analysis", { jobPostingId, recommendationLimit: body.recommendationLimit ?? 3 });

    return HttpResponse.json({
      jobId: job.jobId,
      status: job.status,
      message: "채용공고 분석 작업이 생성되었습니다.",
      resultId: null,
      error: null,
    });
  }),

  // 11. 공고 분석 상태 및 결과 조회
  http.get(`${BASE_URL}/analysis-jobs/:jobId`, ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const job = pollJob(Number(params.jobId));
    if (!job) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "작업을 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "job not found" },
        },
        { status: 404 },
      );
    }

    if (job.status !== "completed") {
      return HttpResponse.json({
        jobId: job.jobId,
        status: job.status,
        message: "채용공고와 프로젝트를 비교하고 있습니다.",
        resultId: null,
        error: null,
      });
    }

    const jobPostingId = (job.payload?.jobPostingId as number) ?? 201;

    return HttpResponse.json({
      jobId: job.jobId,
      status: "completed",
      message: "채용공고 분석이 완료되었습니다.",
      resultId: 401,
      error: null,
      jobPosting: {
        jobPostingId,
        companyName: "예시회사",
        role: "Backend Developer",
        requiredSkills: ["Spring Boot", "MySQL"],
        preferredSkills: ["Docker", "AWS"],
        competencies: ["문제 해결", "협업"],
      },
      recommendedProjects: [
        {
          projectId: 1,
          title: "쇼핑몰 백엔드 API 서버",
          score: 91,
          reason: "Spring Boot와 MySQL 경험이 공고의 필수 기술과 잘 맞습니다.",
          matchedSkills: ["Spring Boot", "MySQL"],
          missingSkills: ["AWS"],
          evidenceIds: [1001, 1002],
        },
        {
          projectId: 2,
          title: "실시간 채팅 서버",
          score: 84,
          reason: "백엔드 API 설계와 서버 운영 경험을 보여줄 수 있습니다.",
          matchedSkills: ["WebSocket", "Redis"],
          missingSkills: ["Spring Boot"],
          evidenceIds: [1003],
        },
        {
          projectId: 3,
          title: "게시판 REST API",
          score: 78,
          reason: "REST API 설계 경험이 직무 요구사항과 일부 연결됩니다.",
          matchedSkills: ["REST API", "MySQL"],
          missingSkills: ["Docker", "AWS"],
          evidenceIds: [1004],
        },
      ],
    });
  }),

  // 12. 이력서 생성 시작
  http.post(`${BASE_URL}/resume-jobs`, async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const body = (await request.json()) as { jobPostingId?: number; projectIds?: number[] };
    if (!body.projectIds || body.projectIds.length === 0) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "이력서 생성에 사용할 프로젝트를 1개 이상 선택해주세요.",
          error: {
            code: "PROJECT_SELECTION_REQUIRED",
            detail: "projectIds must contain at least one project id.",
          },
        },
        { status: 400 },
      );
    }

    const job = createJob("resume", { jobPostingId: body.jobPostingId, projectIds: body.projectIds });
    return HttpResponse.json({
      jobId: job.jobId,
      status: job.status,
      message: "이력서 초안 생성 작업이 생성되었습니다.",
      resultId: null,
      error: null,
    });
  }),

  // 13. 이력서 생성 상태 조회
  http.get(`${BASE_URL}/resume-jobs/:jobId`, ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const job = pollJob(Number(params.jobId));
    if (!job) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "작업을 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "job not found" },
        },
        { status: 404 },
      );
    }

    if (job.status !== "completed") {
      return HttpResponse.json({
        jobId: job.jobId,
        status: job.status,
        message: "선택한 프로젝트를 기반으로 이력서 초안을 작성하고 있습니다.",
        resultId: null,
        error: null,
      });
    }

    if (!job.resultId) {
      const resumeResultId = nextResumeResultIdValue();
      job.resultId = resumeResultId;
      resumeResults[resumeResultId] = buildResumeResult(resumeResultId, job.payload?.jobPostingId as number);
    }

    return HttpResponse.json({
      jobId: job.jobId,
      status: "completed",
      message: "이력서 초안 생성이 완료되었습니다.",
      resultId: job.resultId,
      error: null,
    });
  }),

  // 14. 이력서 결과 조회
  http.get(`${BASE_URL}/resume-results/:resumeResultId`, ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const result = resumeResults[Number(params.resumeResultId)];
    if (!result) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "이력서 결과를 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "resume result not found" },
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(result);
  }),

  // 15. 근거 조회
  http.get(`${BASE_URL}/evidences/:evidenceId`, ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const evidence = evidences[Number(params.evidenceId)];
    if (!evidence) {
      return HttpResponse.json(
        {
          status: "failed",
          message: "근거를 찾을 수 없습니다.",
          error: { code: "PROJECT_NOT_FOUND", detail: "evidence not found" },
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(evidence);
  }),
];

function buildResumeResult(resumeResultId: number, jobPostingId?: number) {
  return {
    resumeResultId,
    jobPostingId: jobPostingId ?? 201,
    title: "Backend Developer 지원 이력서 초안",
    summary: "Spring Boot와 MySQL 기반 백엔드 API 개발 경험을 중심으로 구성한 이력서 초안입니다.",
    sections: [
      {
        sectionType: "profile_summary",
        heading: "요약",
        content: "Spring Boot 기반 API 서버 개발과 MySQL 데이터 모델링 경험을 보유한 백엔드 개발자입니다.",
        evidenceIds: [1001, 1002],
      },
      {
        sectionType: "skills",
        heading: "기술 스택",
        content: "Spring Boot, MySQL, JPA, Docker",
        evidenceIds: [1001, 1002],
      },
      {
        sectionType: "project",
        heading: "쇼핑몰 백엔드 API 서버",
        content:
          "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현했습니다. 공고의 필수 기술인 Spring Boot와 MySQL 경험을 직접적으로 보여줄 수 있는 프로젝트입니다.",
        projectId: 1,
        evidenceIds: [1001, 1002],
      },
    ],
    missingSkills: ["AWS"],
    suggestedProjects: [
      {
        title: "Spring Boot 애플리케이션 AWS 배포 프로젝트",
        description: "기존 Spring Boot 프로젝트를 Docker 이미지로 만들고 AWS EC2에 배포하는 프로젝트입니다.",
        targetSkills: ["AWS", "Docker"],
        estimatedDuration: "3~5일",
        reason: "공고에서 AWS 경험을 우대하지만 기존 프로젝트 근거에서 AWS 사용 경험이 확인되지 않았습니다.",
      },
    ],
    warnings: ["성과 수치가 확인되지 않아 정량적 성과 문장은 생성하지 않았습니다."],
    createdAt: new Date().toISOString(),
  };
}
