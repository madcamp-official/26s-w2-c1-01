from fastapi import FastAPI
from app.routers import projects, job_postings, analysis, resumes

app = FastAPI()

app.include_router(projects.router)
app.include_router(job_postings.router)
app.include_router(analysis.router)
app.include_router(resumes.router)

@app.get("/")
def root():
    return {"message": "Backend server is running"}