from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.services.llm_pipeline import json_list_to_strings, unique_strings

RULE_SCORE_WEIGHT = 0.4
VECTOR_SCORE_WEIGHT = 0.6
RULE_SCORE_SATURATION_EXPONENT = 0.65

SKILL_ALIASES = {
    "amazon web services": "aws",
    "ec2": "aws",
    "lambda": "aws",
    "s3": "aws",
    "aws s3": "aws",
    "aws ec2": "aws",
    "aws lambda": "aws",
    "js": "javascript",
    "javascript": "javascript",
    "node": "node.js",
    "nodejs": "node.js",
    "node.js": "node.js",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "springboot": "spring boot",
    "spring boot": "spring boot",
    "ts": "typescript",
    "typescript": "typescript",
}


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, value))


def _normalize_skill(skill: str) -> str:
    normalized = " ".join(
        skill.casefold()
        .replace("_", " ")
        .replace("-", " ")
        .replace("/", " ")
        .split()
    )
    compact = normalized.replace(" ", "")
    return SKILL_ALIASES.get(normalized) or SKILL_ALIASES.get(compact) or normalized


def _skill_tokens(skill: str) -> set[str]:
    normalized = _normalize_skill(skill)
    tokens = set(normalized.replace(".", " ").split())
    tokens.add(normalized)
    compact = normalized.replace(" ", "").replace(".", "")
    if compact:
        tokens.add(compact)
    return tokens


def _skills_match(target_skill: str, project_skill: str) -> bool:
    target_normalized = _normalize_skill(target_skill)
    project_normalized = _normalize_skill(project_skill)
    if target_normalized == project_normalized:
        return True

    target_tokens = _skill_tokens(target_skill)
    project_tokens = _skill_tokens(project_skill)
    if target_normalized in project_tokens or project_normalized in target_tokens:
        return True

    target_compact = target_normalized.replace(" ", "").replace(".", "")
    project_compact = project_normalized.replace(" ", "").replace(".", "")
    if not target_compact or not project_compact:
        return False

    return (
        target_compact in project_compact
        and len(target_compact) >= 3
    ) or (
        project_compact in target_compact
        and len(project_compact) >= 3
    )


def _has_skill_match(target_skill: str, project_skills: list[str]) -> bool:
    return any(_skills_match(target_skill, project_skill) for project_skill in project_skills)


def _saturated_coverage_score(matched_count: int, total_count: int) -> float:
    if total_count <= 0:
        return 0.0
    coverage = matched_count / total_count
    return _clamp_score(coverage ** RULE_SCORE_SATURATION_EXPONENT)


def _rule_match(
    job_posting: JobPosting,
    project: Project,
) -> tuple[float, list[str], list[str]]:
    required_skills = json_list_to_strings(job_posting.required_skills)
    preferred_skills = json_list_to_strings(job_posting.preferred_skills)
    target_skills = unique_strings(required_skills + preferred_skills)
    if not target_skills:
        return 0.0, [], []

    project_skills = json_list_to_strings(project.skills)
    matched_skills = [
        skill for skill in target_skills if _has_skill_match(skill, project_skills)
    ]
    missing_skills = [
        skill for skill in required_skills if not _has_skill_match(skill, project_skills)
    ]

    return (
        _saturated_coverage_score(len(matched_skills), len(target_skills)),
        matched_skills,
        missing_skills,
    )


def _vector_scores(
    db: Session,
    user_id: int,
    job_posting: JobPosting,
) -> dict[int, float]:
    if job_posting.content_embedding is None:
        return {}

    distance = Project.summary_embedding.cosine_distance(job_posting.content_embedding).label(
        "distance"
    )
    rows = db.execute(
        select(Project.id, distance)
        .where(
            Project.user_id == user_id,
            Project.is_archived.is_(False),
            Project.summary_embedding.is_not(None),
        )
        .order_by(distance)
    ).all()

    return {
        project_id: _clamp_score(1.0 - float(vector_distance))
        for project_id, vector_distance in rows
        if vector_distance is not None
    }


def recommend_projects_hybrid(
    db: Session,
    user_id: int,
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
    recommendation_limit: int,
) -> list[dict]:
    vector_scores = _vector_scores(db, user_id, job_posting)
    has_vector_scores = bool(vector_scores)

    recommendations: list[dict] = []
    for project in projects:
        rule_score, matched_skills, missing_skills = _rule_match(job_posting, project)
        vector_score = vector_scores.get(project.id)

        if vector_score is None:
            hybrid_score = rule_score
        else:
            hybrid_score = (RULE_SCORE_WEIGHT * rule_score) + (
                VECTOR_SCORE_WEIGHT * vector_score
            )

        evidence_ids = [
            evidence.id for evidence in evidence_by_project.get(project.id, [])
        ]
        score = round(_clamp_score(hybrid_score) * 100)
        reason_parts = [
            f"rule score {round(rule_score * 100)}%",
        ]
        if vector_score is not None:
            reason_parts.append(f"vector score {round(vector_score * 100)}%")
        elif has_vector_scores:
            reason_parts.append("vector score unavailable")
        reason = f"{project.title} selected by hybrid scoring ({', '.join(reason_parts)})."

        recommendations.append(
            {
                "projectId": project.id,
                "score": score,
                "reason": reason,
                "matchedSkills": matched_skills,
                "missingSkills": missing_skills,
                "evidenceIds": evidence_ids,
            }
        )

    return sorted(
        recommendations,
        key=lambda item: item["score"],
        reverse=True,
    )[:recommendation_limit]
