// 인메모리 mock 데이터 저장소. api-spec.md 예시 데이터를 초기값으로 사용합니다.

export interface MockProject {
  projectId: number;
  title: string;
  description: string;
  role: string;
  skills: string[];
  achievements: string[];
  sourceType: string;
  sourceUrl: string;
  evidenceIds: number[];
}

export interface MockEvidence {
  evidenceId: number;
  sourceType: string;
  sourceUrl: string;
  title: string;
  content: string;
  projectId: number;
}

export interface MockJob {
  jobId: number;
  type: "github-collection" | "job-analysis" | "resume";
  status: "pending" | "running" | "completed" | "failed";
  pollCount: number;
  resultId: number | null;
  payload?: Record<string, unknown>;
}

export const MOCK_ACCESS_TOKEN = "mock-service-access-token";

export const currentUser = {
  id: 1,
  githubId: "terry2549",
  name: "김태현",
  avatarUrl: "https://github.com/terry2549.png",
};

export const projects: MockProject[] = [
  {
    projectId: 1,
    title: "쇼핑몰 백엔드 API 서버",
    description: "Spring Boot와 MySQL을 사용해 주문, 상품, 회원 API를 구현한 프로젝트",
    role: "백엔드 개발",
    skills: ["Spring Boot", "MySQL", "JPA"],
    achievements: ["주문 API 구현", "상품 검색 기능 구현"],
    sourceType: "github",
    sourceUrl: "https://github.com/example/shop-server",
    evidenceIds: [1001, 1002],
  },
  {
    projectId: 2,
    title: "실시간 채팅 서버",
    description: "WebSocket과 Redis를 사용한 실시간 채팅 백엔드",
    role: "백엔드 개발",
    skills: ["WebSocket", "Redis"],
    achievements: ["실시간 메시지 브로드캐스트 구현"],
    sourceType: "github",
    sourceUrl: "https://github.com/example/chat-server",
    evidenceIds: [1003],
  },
  {
    projectId: 3,
    title: "게시판 REST API",
    description: "REST 원칙에 맞춘 게시판 API 서버",
    role: "백엔드 개발",
    skills: ["REST API", "MySQL"],
    achievements: ["CRUD API 설계"],
    sourceType: "github",
    sourceUrl: "https://github.com/example/board-api",
    evidenceIds: [1004],
  },
];

export const evidences: Record<number, MockEvidence> = {
  1001: {
    evidenceId: 1001,
    sourceType: "github",
    sourceUrl: "https://github.com/example/shop-server",
    title: "README.md",
    content: "Spring Boot와 MySQL을 사용한 쇼핑몰 백엔드 API 서버입니다.",
    projectId: 1,
  },
  1002: {
    evidenceId: 1002,
    sourceType: "github",
    sourceUrl: "https://github.com/example/shop-server",
    title: "README.md - 주문 API",
    content: "주문 생성/조회/취소 API를 JPA로 구현했습니다.",
    projectId: 1,
  },
  1003: {
    evidenceId: 1003,
    sourceType: "github",
    sourceUrl: "https://github.com/example/chat-server",
    title: "README.md",
    content: "Redis Pub/Sub 기반 실시간 채팅 서버입니다.",
    projectId: 2,
  },
  1004: {
    evidenceId: 1004,
    sourceType: "github",
    sourceUrl: "https://github.com/example/board-api",
    title: "README.md",
    content: "게시글/댓글 REST API를 제공합니다.",
    projectId: 3,
  },
};

export const jobPostings: Record<
  number,
  { jobPostingId: number; inputType: string; rawText: string; status: string }
> = {};

export const resumeResults: Record<number, unknown> = {};

const jobs = new Map<number, MockJob>();
let nextJobId = 100;
let nextJobPostingId = 200;
let nextResumeResultId = 600;

export function createJob(
  type: MockJob["type"],
  payload?: Record<string, unknown>,
): MockJob {
  const jobId = ++nextJobId;
  const job: MockJob = { jobId, type, status: "pending", pollCount: 0, resultId: null, payload };
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: number): MockJob | undefined {
  return jobs.get(jobId);
}

// 폴링 2번째 응답부터 completed로 전환해 실제 로딩 화면 흐름을 재현합니다.
export function pollJob(jobId: number): MockJob | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  job.pollCount += 1;
  if (job.status === "pending" || job.status === "running") {
    job.status = job.pollCount >= 2 ? "completed" : "running";
  }
  return job;
}

export function nextJobPostingIdValue(): number {
  return ++nextJobPostingId;
}

export function nextResumeResultIdValue(): number {
  return ++nextResumeResultId;
}
