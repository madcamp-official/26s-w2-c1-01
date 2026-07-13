from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import projects, job_postings, analysis, resumes, auth, evidences, collection, debug_github



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(job_postings.router)
app.include_router(analysis.router)
app.include_router(resumes.router)
app.include_router(auth.router)
app.include_router(evidences.router)
app.include_router(collection.router)
app.include_router(debug_github.router)

@app.get("/")
def root():
    return {"message": "Backend server is running"}
