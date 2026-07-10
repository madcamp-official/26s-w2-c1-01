# backend

백엔드 (담당: 김태현)

프레임워크는 아직 미정입니다. Express / FastAPI / NestJS 등으로 확정되면 이 폴더 안에 해당 프레임워크의 표준 설정(`package.json` 또는 `requirements.txt`, 엔트리 포인트 등)을 추가하세요.

## 폴더 구조

- `src/routes/` — API 엔드포인트 (채용공고 등록, 포트폴리오 등록, 분석 실행, 결과 조회 등)
- `src/services/parsing/` — 채용공고 URL·이미지, GitHub/Notion/블로그/PDF 등 외부 자료 파싱
- `src/services/llm/` — LLM 분석 파이프라인 (구조화, 요약, 문장 초안 생성 등)
- `src/services/matching/` — 채용공고-프로젝트 매칭, 적합도 순위 계산, 부족 역량 탐지
- `src/models/` — DB 모델 / 스키마
- `src/db/` — DB 연결 및 마이그레이션
- `src/types/` — 백엔드에서 사용하는 타입/인터페이스 정의 (프론트엔드와 공유하는 스키마 포함)
- `tests/` — 테스트 코드
