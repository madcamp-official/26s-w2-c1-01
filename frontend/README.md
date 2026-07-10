# frontend

프론트엔드 (담당: 유나연)

프레임워크는 아직 미정입니다. React+Vite / Next.js 등으로 확정되면 이 폴더 안에 해당 프레임워크의 표준 설정(`package.json`, 빌드 설정 등)을 추가하세요.

## 폴더 구조

- `src/pages/` — 화면 단위 페이지 (채용공고 입력/업로드, 포트폴리오 등록, 프로젝트 편집, 분석 진행 상태, 추천 결과)
- `src/components/` — 여러 화면에서 재사용되는 공통 UI 컴포넌트
- `src/features/` — 도메인별 로직·상태 (job-posting, portfolio, project, matching-result 등 기능 단위 묶음)
- `src/api/` — 백엔드 API 호출 클라이언트
- `src/hooks/` — 커스텀 훅
- `src/types/` — 프론트엔드에서 사용하는 타입 정의 (백엔드와 공유하는 스키마 포함)
- `public/` — 정적 파일
