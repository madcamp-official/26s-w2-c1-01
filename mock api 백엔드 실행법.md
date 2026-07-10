# Mock API 백엔드 실행법

이 문서는 현재 FastAPI mock API 백엔드를 다른 컴퓨터에서 실행하는 방법을 정리한 문서입니다.

## 1. 저장소 받기

```powershell
git clone <repository-url>
cd 26s-w2-c1-01\backend
```

`<repository-url>`에는 실제 GitHub 저장소 주소를 넣습니다.

## 2. Python 확인

```powershell
python --version
```

Python 3.10 이상을 권장합니다.

## 3. 가상환경 만들기

```powershell
python -m venv .venv
```

## 4. 가상환경 실행

PowerShell에서 아래 명령어를 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

성공하면 터미널 앞에 `(.venv)`가 표시됩니다.

## 5. 패키지 설치

```powershell
pip install -r requirements.txt
```

## 6. 환경변수 설정

백엔드 폴더에 `.env` 파일을 만들고 GitHub OAuth 정보를 입력합니다.

```powershell
copy .env.example .env
```

`backend/.env` 예시:

```env
GITHUB_CLIENT_ID=GitHub_OAuth_App_Client_ID
GITHUB_CLIENT_SECRET=GitHub_OAuth_App_Client_Secret
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_ACCESS_TOKEN_SECRET=dev-secret-change-me
```

GitHub OAuth App의 로컬 개발용 callback URL은 아래와 같이 설정합니다.

```text
http://localhost:5173/auth/github/callback
```

`.env` 파일은 비밀값을 포함하므로 GitHub에 올리지 않습니다.

## 7. 백엔드 서버 실행

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

서버 주소:

```text
http://127.0.0.1:8000
```

Swagger API 문서:

```text
http://127.0.0.1:8000/docs
```

## 8. 프론트 연결 설정

프론트엔드의 `.env.local`에는 아래 값을 사용합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_ENABLE_MOCKS=false
```

백엔드는 개발용 CORS 설정으로 아래 프론트 주소를 허용합니다.

```text
http://localhost:5173
http://127.0.0.1:5173
```

## 9. 현재 사용 가능한 API

```text
GET   /auth/github/login
GET   /auth/github/callback
GET   /me

GET   /projects
PATCH /projects/{project_id}

POST  /job-postings
POST  /job-postings/{job_posting_id}/analysis-jobs
GET   /analysis-jobs/{job_id}

POST  /resume-jobs
GET   /resume-jobs/{job_id}
GET   /resume-results/{resume_result_id}
```

## 10. 매번 다시 실행할 때

이미 `.venv`를 만든 뒤에는 아래 순서만 실행하면 됩니다.

```powershell
cd 26s-w2-c1-01\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 11. 종료 방법

서버가 실행 중인 터미널에서 `Ctrl + C`를 누릅니다.

가상환경을 끄려면 아래 명령어를 실행합니다.

```powershell
deactivate
```
