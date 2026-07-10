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

## 6. 백엔드 서버 실행

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

## 7. 현재 사용 가능한 Mock API

```text
GET   /projects
PATCH /projects/{project_id}

POST  /job-postings
POST  /job-postings/{job_posting_id}/analysis-jobs
GET   /analysis-jobs/{job_id}

POST  /resume-jobs
GET   /resume-jobs/{job_id}
GET   /resume-results/{resume_result_id}
```

## 8. 매번 다시 실행할 때

이미 `.venv`를 만든 뒤에는 아래 순서만 실행하면 됩니다.

```powershell
cd 26s-w2-c1-01\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 9. 종료 방법

서버가 실행 중인 터미널에서 `Ctrl + C`를 누릅니다.

가상환경을 끄려면 아래 명령어를 실행합니다.

```powershell
deactivate
```

