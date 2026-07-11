import type { User } from "../../types/user";
import type { Project } from "../../types/project";
import type { ParsedJobPosting } from "../../types/jobPosting";
import type { RecommendedProject } from "../../types/analysis";
import type { ResumeResult } from "../../types/resume";
import type { Evidence } from "../../types/evidence";
import type { AnalysisResult } from "../../types/result";
import type { HistoryEntry } from "../../types/history";
import type { ConnectedSource } from "../../types/portfolio";
import type { AnalysisStep } from "../../types/analysis";

export const mockUser: User = {
  id: 1,
  githubId: "yxxnxyxxn",
  name: "유나연",
  avatarUrl: "https://github.com/yxxnxyxxn.png",
  email: "yxxnxyxxn@gmail.com",
  headline: "프론트엔드 개발자 지망",
};

export const mockProjects: Project[] = [
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
    description: "WebSocket과 Redis를 사용한 실시간 채팅 서버",
    role: "백엔드 개발",
    skills: ["WebSocket", "Redis"],
    achievements: ["다중 채팅방 구현", "메시지 브로드캐스트 최적화"],
    sourceType: "github",
    sourceUrl: "https://github.com/example/chat-server",
    evidenceIds: [1003],
  },
  {
    projectId: 3,
    title: "게시판 REST API",
    description: "REST API 설계 원칙을 적용한 게시판 서버",
    role: "백엔드 개발",
    skills: ["REST API", "MySQL"],
    achievements: ["페이지네이션 구현", "권한 검증 미들웨어 구현"],
    sourceType: "github",
    sourceUrl: "https://github.com/example/board-api",
    evidenceIds: [1004],
  },
];

export const mockParsedJobPosting: ParsedJobPosting = {
  jobPostingId: 201,
  companyName: "예시회사",
  role: "Backend Developer",
  requiredSkills: ["Spring Boot", "MySQL"],
  preferredSkills: ["Docker", "AWS"],
  competencies: ["문제 해결", "협업"],
};

export const mockRecommendedProjects: RecommendedProject[] = [
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
];

export const mockResumeResult: ResumeResult = {
  resumeResultId: 601,
  jobPostingId: 201,
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
  createdAt: "2026-07-10T16:30:00+09:00",
};

export const mockEvidences: Record<number, Evidence> = {
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
    title: "README.md · 트러블슈팅",
    content: "주문 동시성 문제를 낙관적 락으로 해결했습니다.",
    projectId: 1,
  },
  1003: {
    evidenceId: 1003,
    sourceType: "github",
    sourceUrl: "https://github.com/example/chat-server",
    title: "README.md",
    content: "WebSocket과 Redis Pub/Sub으로 다중 서버 환경에서도 메시지를 브로드캐스트합니다.",
    projectId: 2,
  },
  1004: {
    evidenceId: 1004,
    sourceType: "github",
    sourceUrl: "https://github.com/example/board-api",
    title: "README.md",
    content: "REST 원칙에 따라 리소스를 설계하고 페이지네이션을 구현했습니다.",
    projectId: 3,
  },
};

export const mockAnalysisSteps: AnalysisStep[] = [
  { label: "채용공고 구조화", at: 0 },
  { label: "프로젝트 비교", at: 33 },
  { label: "이력서 문장 생성", at: 66 },
  { label: "근거 연결", at: 90 },
];

export const mockResult: AnalysisResult = {
  jobTitle: "예시회사 · Backend Developer",
  matchScore: 82,
  skills: [
    { name: "Spring Boot", pct: 95 },
    { name: "MySQL", pct: 88 },
    { name: "REST API", pct: 80 },
    { name: "Docker", pct: 45, weak: true },
    { name: "AWS", pct: 20, weak: true },
  ],
  rankedProjects: [
    {
      rank: 1,
      title: "쇼핑몰 백엔드 API 서버",
      fitPct: 91,
      description: "Spring Boot와 MySQL 경험이 공고의 필수 기술과 잘 맞습니다.",
    },
    {
      rank: 2,
      title: "실시간 채팅 서버",
      fitPct: 84,
      description: "백엔드 API 설계와 서버 운영 경험을 보여줄 수 있습니다.",
    },
    {
      rank: 3,
      title: "게시판 REST API",
      fitPct: 78,
      description: "REST API 설계 경험이 직무 요구사항과 일부 연결됩니다.",
    },
  ],
  sentences: [
    {
      id: "s1",
      text: "Spring Boot와 MySQL을 사용해 주문·상품·회원 API를 구현한 백엔드 개발 경험이 있습니다.",
      srcRef: "github.com/example/shop-server · README.md",
      srcQuote: "Spring Boot와 MySQL을 사용한 쇼핑몰 백엔드 API 서버입니다.",
    },
    {
      id: "s2",
      text: "주문 동시성 문제를 낙관적 락으로 해결하며 트랜잭션 안정성을 확보했습니다.",
      srcRef: "github.com/example/shop-server · README.md · 트러블슈팅",
      srcQuote: "주문 동시성 문제를 낙관적 락으로 해결했습니다.",
    },
    {
      id: "s3",
      text: "WebSocket과 Redis Pub/Sub을 활용해 실시간 채팅 서버를 구현했습니다.",
      srcRef: "github.com/example/chat-server · README.md",
      srcQuote: "WebSocket과 Redis Pub/Sub으로 다중 서버 환경에서도 메시지를 브로드캐스트합니다.",
    },
  ],
  gaps: [
    {
      target: "AWS",
      title: "Spring Boot 애플리케이션 AWS 배포 프로젝트",
      features: "Docker 이미지 빌드, EC2 배포, 환경 변수 관리",
      duration: "3~5일",
      deliverables: "배포된 서비스 URL, 배포 문서",
    },
    {
      target: "Docker",
      title: "컨테이너 기반 로컬 개발 환경 구성",
      features: "Docker Compose, MySQL 컨테이너, 앱 컨테이너 연동",
      duration: "2~3일",
      deliverables: "docker-compose.yml, 실행 가이드",
    },
  ],
};

export const mockHistory: HistoryEntry[] = [
  {
    id: "h1",
    jobTitle: "예시회사 · Backend Developer",
    date: "2026-07-10",
    projectCount: 3,
    matchScore: 82,
    resultId: "r1",
  },
  {
    id: "h2",
    jobTitle: "스타트업 A · Frontend Engineer",
    date: "2026-07-08",
    projectCount: 2,
    matchScore: 65,
    resultId: "r2",
  },
];

export const mockConnectedSources: ConnectedSource[] = [
  { id: "cs1", type: "GitHub", label: "github.com/yxxnxyxxn", connected: true },
  { id: "cs2", type: "Notion", label: "notion.so/portfolio", connected: true },
  { id: "cs3", type: "PDF", label: "resume_2026.pdf", connected: false },
];
