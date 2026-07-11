import type { Project } from "../../types/project";
import type { AnalysisResult } from "../../types/result";
import type { HistoryEntry } from "../../types/history";
import type { ConnectedSource } from "../../types/portfolio";
import type { User } from "../../types/user";

export const mockUser: User = {
  id: "u1",
  name: "유나연",
  email: "yxxnxyxxn@gmail.com",
  headline: "프론트엔드 개발자 지망",
};

export const mockProjects: Project[] = [
  {
    id: "p1",
    title: "실시간 협업 화이트보드",
    role: "프론트엔드 리드 (2인 팀)",
    stack: ["React", "TypeScript", "WebSocket", "Canvas API"],
    problem: "동시 편집 시 도형 상태가 충돌하는 문제를 CRDT 기반 병합 로직으로 해결",
    result: "평균 렌더링 프레임 28fps → 58fps 개선, 동시 접속 40명 테스트 통과",
    source: "GitHub",
    excluded: false,
  },
  {
    id: "p2",
    title: "LLM 회의록 요약 봇",
    role: "풀스택 (개인 프로젝트)",
    stack: ["FastAPI", "OpenAI API", "React"],
    problem: "긴 회의록의 토큰 한도 초과 문제를 청크 분할 + 맵리듀스 요약으로 해결",
    result: "60분 회의록 요약 시간 4분 → 40초 단축, 사내 스터디 12명 사용",
    source: "Notion",
    excluded: false,
  },
  {
    id: "p3",
    title: "대학 커뮤니티 앱",
    role: "프론트엔드 (4인 팀)",
    stack: ["React Native", "Firebase"],
    problem: "게시글 목록 스크롤 버벅임을 리스트 가상화로 해결",
    result: "출시 3개월 만에 교내 사용자 1,200명 확보",
    source: "PDF 이력서",
    excluded: true,
  },
  {
    id: "p4",
    title: "개인 블로그 리뉴얼",
    role: "개인 프로젝트",
    stack: ["Next.js", "MDX"],
    problem: "Lighthouse 성능 점수 61점을 이미지 최적화·SSG 전환으로 개선",
    result: "성능 점수 98점 달성, 월 방문자 800명",
    source: "GitHub",
    excluded: false,
  },
];

export const mockAnalysisSteps = [
  { label: "채용공고를 분석하고 있어요", at: 0 },
  { label: "포트폴리오와 매칭하는 중이에요", at: 30 },
  { label: "이력서 문장 초안을 만들고 있어요", at: 60 },
  { label: "부족 역량을 점검하고 있어요", at: 85 },
];

export const mockResult: AnalysisResult = {
  id: "r1",
  jobTitle: "핀테크 스타트업 A사 · 프론트엔드 개발자 공고 기준",
  matchScore: 78,
  skills: [
    { name: "React / 컴포넌트 설계", pct: 92, weak: false },
    { name: "TypeScript", pct: 88, weak: false },
    { name: "상태 관리", pct: 74, weak: false },
    { name: "성능 최적화", pct: 65, weak: false },
    { name: "CI/CD", pct: 42, weak: true },
    { name: "테스트 자동화", pct: 38, weak: true },
  ],
  rankedProjects: [
    {
      rank: 1,
      title: "실시간 협업 화이트보드",
      fitPct: 91,
      description:
        "공고의 실시간 데이터 처리 · React 성능 최적화 요건과 직접적으로 겹치는 유일한 경험이에요.",
    },
    {
      rank: 2,
      title: "LLM 회의록 요약 봇",
      fitPct: 82,
      description: "우대 사항인 LLM API 활용 경험을 증명해요.",
    },
    {
      rank: 3,
      title: "대학 커뮤니티 앱",
      fitPct: 64,
      description:
        "사용자 규모 성과는 좋지만 기술 스택이 공고와 달라요. 간단히만 언급하세요.",
    },
  ],
  sentences: [
    {
      id: "s1",
      text: "WebSocket 기반 실시간 동기화 구조를 설계하고 CRDT 병합 로직을 도입해, 40명 동시 편집 환경에서 상태 충돌 없이 렌더링 성능을 2배(28→58fps) 개선했습니다.",
      srcRef: "GitHub · whiteboard/README.md › 트러블슈팅",
      srcQuote:
        "CRDT 기반 병합 로직 도입 후 동시 접속 40명 부하 테스트에서 충돌 0건, 평균 프레임 28fps에서 58fps로 개선",
    },
    {
      id: "s2",
      text: "LLM 토큰 한도를 초과하는 장문 회의록을 청크 분할–맵리듀스 요약 파이프라인으로 처리해, 60분 분량 요약 시간을 4분에서 40초로 단축했습니다.",
      srcRef: "Notion · 회의록 요약 봇 회고",
      srcQuote:
        "청크 분할 후 부분 요약을 다시 합치는 방식으로 변경하면서 60분짜리 회의록 기준 4분 → 40초",
    },
    {
      id: "s3",
      text: "리스트 가상화를 적용해 커뮤니티 앱 게시글 스크롤 버벅임을 해소했으며, 출시 3개월 만에 교내 사용자 1,200명을 확보한 서비스의 프론트엔드를 담당했습니다.",
      srcRef: "PDF 이력서 · 2p 프로젝트 경험",
      srcQuote: "FlatList 가상화 적용으로 스크롤 프레임 저하 해결, 출시 3개월 사용자 1,200명",
    },
  ],
  gaps: [
    {
      target: "테스트 자동화",
      title: "E2E 테스트 파이프라인 구축",
      features: "화이트보드 프로젝트에 Playwright 핵심 시나리오 5개 작성 + PR마다 자동 실행",
      duration: "2주 (주말 기준 4일)",
      deliverables: "테스트 코드, 커버리지 리포트, 트러블슈팅 블로그 1편",
    },
    {
      target: "CI/CD",
      title: "개인 프로젝트 자동 배포 구축",
      features: "GitHub Actions로 빌드→테스트→배포 워크플로 구성, 스테이징/프로덕션 분리",
      duration: "1주",
      deliverables: "워크플로 YAML, 배포 아키텍처 다이어그램, README 문서화",
    },
  ],
};

export const mockHistory: HistoryEntry[] = [
  {
    id: "h1",
    jobTitle: "핀테크 스타트업 A사 · 프론트엔드 개발자",
    date: "2026. 7. 11",
    projectCount: 4,
    matchScore: 78,
    resultId: "r1",
  },
  {
    id: "h2",
    jobTitle: "커머스 B사 · 웹 프론트엔드 (React)",
    date: "2026. 7. 8",
    projectCount: 3,
    matchScore: 61,
    resultId: "r2",
  },
];

export const mockConnectedSources: ConnectedSource[] = [
  { id: "cs1", type: "GitHub", label: "github.com/yxxnxyxxn", connected: true },
  { id: "cs2", type: "Notion", label: "notion.so/yeon-portfolio", connected: true },
  { id: "cs3", type: "PDF", label: "포트폴리오_2026.pdf", connected: false },
];
