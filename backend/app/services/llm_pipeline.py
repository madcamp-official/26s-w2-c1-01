import json
from collections import OrderedDict
from typing import Any

from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.services.llm_client import LLMError, complete_json

KNOWN_SKILLS = [
    "Python",
    "FastAPI",
    "Django",
    "Flask",
    "Java",
    "Spring",
    "Spring Boot",
    "Kotlin",
    "JavaScript",
    "TypeScript",
    "React",
    "Vue",
    "Node.js",
    "Express",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "REST",
    "GraphQL",
    "WebSocket",
    "CI/CD",
    "Git",
]

ROLE_KEYWORDS = [
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "AI Engineer",
    "ML Engineer",
    "Data Engineer",
    "DevOps Engineer",
    "Software Engineer",
]


def unique_strings(values: list[str]) -> list[str]:
    return list(OrderedDict.fromkeys(value for value in values if value))


def json_list_to_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    items: list[str] = []
    for item in value:
        if isinstance(item, str):
            items.append(item)
        elif isinstance(item, dict):
            name = item.get("name") or item.get("skill") or item.get("title")
            if isinstance(name, str):
                items.append(name)
    return unique_strings(items)


PROJECT_ENRICHMENT_SYSTEM_PROMPT = (
    "You are a technical resume writer. Given evidence collected from a GitHub repository "
    "(README, repo metadata), produce a concise, resume-ready project summary. "
    "Base every statement strictly on the provided evidence — never invent metrics, users, "
    "or outcomes that are not supported by the text. If the evidence is too sparse to infer "
    "something, leave it minimal rather than fabricating detail. "
    'Respond with a single JSON object: {"role": string, "skills": string[], '
    '"description": string, "achievements": string[]}. "role" is a short job-title-like '
    'phrase (e.g. "Backend Developer"). "skills" are concrete technologies/tools actually '
    'evidenced. "description" is 1-3 sentences summarizing what the project does. '
    '"achievements" is a list of 0-4 short bullet-style accomplishments; return an empty '
    "list if the evidence does not support any concrete achievement."
)


def build_project_enrichment_payload(project: Project, evidences: list[Evidence]) -> dict:
    return {
        "task": "project_enrichment",
        "instructions": [
            "Use only the provided evidence.",
            "Do not invent achievements, metrics, or users not present in the evidence.",
        ],
        "project": {
            "title": project.title,
            "existingDescription": project.description,
            "existingSkills": project.skills,
            "sourceUrl": project.source_url,
        },
        "evidences": [
            {
                "title": evidence.title,
                "content": evidence.content,
            }
            for evidence in evidences
        ],
    }


def parse_project_enrichment(result: dict) -> dict:
    role = result.get("role")
    description = result.get("description")
    return {
        "role": role.strip() if isinstance(role, str) and role.strip() else None,
        "skills": json_list_to_strings(result.get("skills")),
        "description": description.strip() if isinstance(description, str) and description.strip() else None,
        "achievements": json_list_to_strings(result.get("achievements")),
    }


async def enrich_project_via_llm(project: Project, evidences: list[Evidence]) -> dict | None:
    payload = build_project_enrichment_payload(project, evidences)
    try:
        result = await complete_json(
            PROJECT_ENRICHMENT_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError:
        return None
    return parse_project_enrichment(result)


def build_job_posting_structure_payload(raw_text: str) -> dict:
    return {
        "task": "job_posting_structure",
        "instructions": [
            "Extract only facts explicitly present in the job posting.",
            "Return role, requiredSkills, preferredSkills, and competencies as JSON.",
            "Do not infer unsupported requirements.",
        ],
        "jobPostingText": raw_text,
    }


def structure_job_posting_without_llm(raw_text: str) -> dict:
    normalized_text = raw_text.casefold()
    matched_skills = [
        skill for skill in KNOWN_SKILLS if skill.casefold() in normalized_text
    ]

    role = next(
        (
            role_keyword
            for role_keyword in ROLE_KEYWORDS
            if role_keyword.casefold() in normalized_text
        ),
        None,
    )
    if role is None and "backend" in normalized_text:
        role = "Backend Developer"
    elif role is None and "frontend" in normalized_text:
        role = "Frontend Developer"
    elif role is None and "full stack" in normalized_text:
        role = "Full Stack Developer"

    competencies = []
    if "collaboration" in normalized_text or "team" in normalized_text:
        competencies.append("Collaboration")
    if "problem" in normalized_text:
        competencies.append("Problem solving")
    if "communication" in normalized_text:
        competencies.append("Communication")

    midpoint = max(1, len(matched_skills) // 2)
    return {
        "role": role,
        "requiredSkills": matched_skills[:midpoint],
        "preferredSkills": matched_skills[midpoint:],
        "competencies": unique_strings(competencies),
    }


def build_project_recommendation_payload(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
    recommendation_limit: int,
) -> dict:
    return {
        "task": "project_recommendation",
        "instructions": [
            "Recommend only from the provided projectIds.",
            "Use only provided evidenceIds.",
            "Do not invent achievements, metrics, tools, or project history.",
        ],
        "recommendationLimit": recommendation_limit,
        "jobPosting": {
            "jobPostingId": job_posting.id,
            "role": job_posting.role,
            "requiredSkills": job_posting.required_skills,
            "preferredSkills": job_posting.preferred_skills,
            "competencies": job_posting.competencies,
            "rawText": job_posting.raw_text,
        },
        "projects": [
            {
                "projectId": project.id,
                "title": project.title,
                "description": project.description,
                "role": project.role,
                "skills": project.skills,
                "achievements": project.achievements,
                "evidences": [
                    {
                        "evidenceId": evidence.id,
                        "title": evidence.title,
                        "content": evidence.content,
                    }
                    for evidence in evidence_by_project.get(project.id, [])
                ],
            }
            for project in projects
        ],
    }


def recommend_projects_without_llm(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
    recommendation_limit: int,
) -> list[dict]:
    required_skills = json_list_to_strings(job_posting.required_skills)
    preferred_skills = json_list_to_strings(job_posting.preferred_skills)
    target_skills = unique_strings(required_skills + preferred_skills)
    target_lookup = {skill.casefold() for skill in target_skills}

    recommendations: list[dict] = []
    for project in projects:
        project_skills = json_list_to_strings(project.skills)
        project_lookup = {skill.casefold() for skill in project_skills}
        matched_skills = [
            skill for skill in target_skills if skill.casefold() in project_lookup
        ]
        missing_skills = [
            skill for skill in required_skills if skill.casefold() not in project_lookup
        ]
        score = 50
        if target_lookup:
            score = round(100 * len(matched_skills) / len(target_lookup))
        evidence_ids = [evidence.id for evidence in evidence_by_project.get(project.id, [])]
        reason = (
            f"{project.title} matches {', '.join(matched_skills)}."
            if matched_skills
            else f"{project.title} is included as available project experience."
        )
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

    return sorted(recommendations, key=lambda item: item["score"], reverse=True)[
        :recommendation_limit
    ]


def validate_project_recommendations(
    recommendations: list[dict],
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
) -> list[dict]:
    allowed_project_ids = {project.id for project in projects}
    allowed_evidence_ids_by_project = {
        project_id: {evidence.id for evidence in evidences}
        for project_id, evidences in evidence_by_project.items()
    }

    safe_recommendations: list[dict] = []
    for recommendation in recommendations:
        project_id = recommendation.get("projectId")
        if project_id not in allowed_project_ids:
            continue

        allowed_evidence_ids = allowed_evidence_ids_by_project.get(project_id, set())
        evidence_ids = [
            evidence_id
            for evidence_id in recommendation.get("evidenceIds", [])
            if evidence_id in allowed_evidence_ids
        ]
        safe_recommendations.append(
            {
                **recommendation,
                "evidenceIds": evidence_ids,
            }
        )
    return safe_recommendations


def build_resume_generation_payload(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
) -> dict:
    return {
        "task": "resume_generation",
        "instructions": [
            "Use only selected projects and provided evidence.",
            "Every project section must reference an existing projectId.",
            "Every evidenceIds item must exist in the provided evidence list.",
            "Do not invent metrics or achievements.",
        ],
        "jobPosting": {
            "jobPostingId": job_posting.id,
            "role": job_posting.role,
            "requiredSkills": job_posting.required_skills,
            "preferredSkills": job_posting.preferred_skills,
            "competencies": job_posting.competencies,
        },
        "selectedProjects": [
            {
                "projectId": project.id,
                "title": project.title,
                "description": project.description,
                "role": project.role,
                "skills": project.skills,
                "achievements": project.achievements,
                "evidences": [
                    {
                        "evidenceId": evidence.id,
                        "title": evidence.title,
                        "content": evidence.content,
                    }
                    for evidence in evidence_by_project.get(project.id, [])
                ],
            }
            for project in projects
        ],
    }


def validate_resume_sections(
    sections: list[dict],
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
) -> list[dict]:
    allowed_project_ids = {project.id for project in projects}
    all_evidence_ids = {
        evidence.id
        for evidences in evidence_by_project.values()
        for evidence in evidences
    }

    safe_sections: list[dict] = []
    for section in sections:
        project_id = section.get("projectId")
        if project_id is not None and project_id not in allowed_project_ids:
            continue

        evidence_ids = [
            evidence_id
            for evidence_id in section.get("evidenceIds", [])
            if evidence_id in all_evidence_ids
        ]
        safe_sections.append(
            {
                **section,
                "evidenceIds": evidence_ids,
            }
        )
    return safe_sections
