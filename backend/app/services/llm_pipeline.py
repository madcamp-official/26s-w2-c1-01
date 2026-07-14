import json
import logging
from collections import OrderedDict
from typing import Any

from app.models.evidence import Evidence
from app.models.job_posting import JobPosting
from app.models.project import Project
from app.services.llm_client import LLMError, complete_json

logger = logging.getLogger(__name__)

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
    "You are a senior technical recruiter's ghostwriter, turning GitHub repository evidence "
    "(README, repo metadata) into a resume-ready project entry. Read the evidence closely — "
    "README files usually describe the problem being solved, the architecture, the tech stack, "
    "setup/usage instructions, and sometimes results or design decisions. Mine all of that, "
    "not just the first paragraph. "
    "Base every statement strictly on the provided evidence — never invent metrics, users, "
    "or outcomes that are not supported by the text. If the evidence is too sparse to infer "
    "something, leave it minimal rather than fabricating detail. Prefer specific, concrete "
    "wording (what the project actually does, which components it has, which problems it "
    "solves) over generic filler like '다양한 기능을 제공하는 프로젝트입니다'. "
    'Respond with a single JSON object: {"role": string, "skills": string[], '
    '"description": string, "achievements": string[]}.\n'
    '- "role": a short job-title-like phrase reflecting the primary technical focus '
    '(e.g. "백엔드 개발자", "머신러닝 엔지니어").\n'
    '- "skills": concrete technologies/tools/frameworks actually evidenced, written as their '
    "common names (e.g. \"Python\", \"React\" — do not translate these).\n"
    '- "description": 3-5 sentences covering (1) what problem the project solves and for whom, '
    "(2) how it's built — architecture, key components, or notable technical approach, and "
    "(3) any concrete functionality or scope evidenced (endpoints, modules, data handled, "
    "integrations, etc). Avoid vague generalities; every sentence should carry information "
    "that could only come from this specific repository's evidence.\n"
    '- "achievements": 0-4 bullet-style accomplishments, each describing a concrete thing '
    "that was built or solved (e.g. specific feature implemented, integration completed, "
    "problem overcome) — grounded in the evidence, with numbers/metrics only if the evidence "
    "actually states them. Return an empty list if the evidence supports nothing concrete.\n"
    'Write "role", "description", and every "achievements" entry in Korean, in natural, '
    "professional resume-style language. "
    "Respond with the JSON object only — no explanation, note, or text before or after it."
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
    except LLMError as exc:
        logger.warning("Project enrichment LLM call failed: %s", exc.message)
        return None
    return parse_project_enrichment(result)


MAX_JOB_POSTING_LLM_CHARS = 8000

JOB_POSTING_STRUCTURE_SYSTEM_PROMPT = (
    "You are a technical recruiter analyzing a job posting. Given the raw text scraped from "
    "a job posting page (it may include site navigation or boilerplate noise — ignore that), "
    "extract the structured hiring requirements. "
    "Base every item strictly on text explicitly present in the posting — never infer a skill "
    "or requirement that isn't actually stated. "
    'Respond with a single JSON object: {"role": string | null, "requiredSkills": string[], '
    '"preferredSkills": string[], "competencies": string[]}.\n'
    '- "role": the job title/position being hired for, in Korean if the posting is in Korean '
    "(e.g. \"백엔드 개발자\"), or null if no clear title is stated.\n"
    '- "requiredSkills": concrete technologies/tools/languages explicitly listed as required '
    '(자격요건, 필수 등), written as their common names (e.g. "Python", "AWS" — do not translate '
    "these).\n"
    '- "preferredSkills": concrete technologies/tools explicitly listed as preferred/nice-to-have '
    "(우대사항 등), same naming rule as above.\n"
    '- "competencies": non-technical qualities or soft skills explicitly requested (e.g. '
    "\"협업 능력\", \"문제 해결 능력\"), in Korean if the posting is in Korean.\n"
    "Respond with the JSON object only — no explanation, note, or text before or after it."
)


def build_job_posting_structure_payload(raw_text: str) -> dict:
    return {
        "task": "job_posting_structure",
        "instructions": [
            "Extract only facts explicitly present in the job posting.",
            "Return role, requiredSkills, preferredSkills, and competencies as JSON.",
            "Do not infer unsupported requirements.",
        ],
        "jobPostingText": raw_text[:MAX_JOB_POSTING_LLM_CHARS],
    }


def parse_job_posting_structure(result: dict) -> dict:
    role = result.get("role")
    return {
        "role": role.strip() if isinstance(role, str) and role.strip() else None,
        "requiredSkills": json_list_to_strings(result.get("requiredSkills")),
        "preferredSkills": json_list_to_strings(result.get("preferredSkills")),
        "competencies": json_list_to_strings(result.get("competencies")),
    }


async def structure_job_posting_via_llm(raw_text: str) -> dict | None:
    payload = build_job_posting_structure_payload(raw_text)
    try:
        result = await complete_json(
            JOB_POSTING_STRUCTURE_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError as exc:
        logger.warning("Job posting structure LLM call failed: %s", exc.message)
        return None
    return parse_job_posting_structure(result)


JOB_POSTING_IMAGE_SYSTEM_PROMPT = (
    "You are a technical recruiter analyzing a job posting that was published as an image "
    "(e.g. a recruiting poster/flyer). First, transcribe all visible text from the image as "
    "plain text (preserve the original language; if it's Korean, transcribe in Korean). Then "
    "extract the same structured hiring requirements as you would from a text posting. "
    "Base every item strictly on text actually visible in the image — never infer a skill or "
    "requirement that isn't shown. If the image is not a job posting, or text can't be read, "
    'set "rawText" to an empty string and every other field to its empty/null default. '
    'Respond with a single JSON object: {"rawText": string, "role": string | null, '
    '"requiredSkills": string[], "preferredSkills": string[], "competencies": string[]}.\n'
    '- "rawText": the full transcribed text of the image.\n'
    '- "role": the job title/position being hired for, in Korean if the posting is in Korean, '
    "or null if no clear title is shown.\n"
    '- "requiredSkills": concrete technologies/tools/languages explicitly listed as required, '
    'written as their common names (e.g. "Python", "AWS" — do not translate these).\n'
    '- "preferredSkills": concrete technologies/tools explicitly listed as preferred/nice-to-have, '
    "same naming rule as above.\n"
    '- "competencies": non-technical qualities or soft skills explicitly requested, in Korean if '
    "the posting is in Korean.\n"
    "Respond with the JSON object only — no explanation, note, or text before or after it."
)


def parse_job_posting_image_structure(result: dict) -> dict:
    raw_text = result.get("rawText")
    parsed = parse_job_posting_structure(result)
    parsed["rawText"] = raw_text.strip() if isinstance(raw_text, str) else ""
    return parsed


async def structure_job_posting_from_image(image_data_urls: list[str]) -> dict | None:
    try:
        result = await complete_json(
            JOB_POSTING_IMAGE_SYSTEM_PROMPT,
            "Transcribe and structure the job posting shown in the attached image(s).",
            image_data_urls=image_data_urls,
        )
    except LLMError as exc:
        logger.warning("Job posting image structure LLM call failed: %s", exc.message)
        return None

    parsed = parse_job_posting_image_structure(result)
    if not parsed["rawText"]:
        return None
    return parsed


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


RECOMMENDATION_REASON_SYSTEM_PROMPT = (
    "You are a technical recruiter explaining why a user's project matches a job posting. "
    "Use only the provided job posting, project, scoring data, and source documents. Do not "
    "invent tools, metrics, users, outcomes, or responsibilities. For each evidence item, use "
    "a concrete source document snippet when the source document directly supports the claim. "
    "If no source document supports a claim, use structured project fields and set "
    "sourceDocumentId to null. "
    'Respond with a single JSON object: {"reason": string, "evidences": [{"requirement": '
    'string, "matchType": "skill" | "semantic" | "missing", "sourceDocumentId": number | null, '
    '"content": string, "source": string, "explanation": string}]}. '
    "Write reason and explanation in Korean, concise and recruiter-facing. Return JSON only."
)


def build_recommendation_reason_payload(
    job_posting: JobPosting,
    project: Project,
    recommendation: dict,
    source_documents: list[Any],
) -> dict:
    return {
        "task": "recommendation_reason_generation",
        "instructions": [
            "Use only the provided jobPosting, project, scoring, and sourceDocuments.",
            "Create evidences that explain why this project was recommended for this job posting.",
            "For missing skills, explain that the project does not currently provide clear support.",
            "Do not invent metrics, achievements, tools, or project history.",
        ],
        "jobPosting": {
            "jobPostingId": job_posting.id,
            "role": job_posting.role,
            "requiredSkills": job_posting.required_skills,
            "preferredSkills": job_posting.preferred_skills,
            "competencies": job_posting.competencies,
            "rawText": job_posting.raw_text[:4000],
        },
        "project": {
            "projectId": project.id,
            "title": project.title,
            "description": project.description,
            "role": project.role,
            "skills": project.skills,
            "achievements": project.achievements,
        },
        "scoring": {
            "score": recommendation.get("score"),
            "matchedSkills": recommendation.get("matchedSkills", []),
            "missingSkills": recommendation.get("missingSkills", []),
            "ruleAndVectorReason": recommendation.get("reason"),
        },
        "sourceDocuments": [
            {
                "sourceDocumentId": source_document.id,
                "title": source_document.title,
                "documentType": source_document.document_type,
                "url": source_document.url,
                "rawText": source_document.raw_text[:6000],
            }
            for source_document in source_documents
        ],
    }


def parse_recommendation_reason(result: dict) -> dict:
    reason = result.get("reason")
    parsed_evidences: list[dict] = []
    if isinstance(result.get("evidences"), list):
        for evidence in result["evidences"]:
            if not isinstance(evidence, dict):
                continue
            requirement = evidence.get("requirement")
            match_type = evidence.get("matchType")
            content = evidence.get("content")
            source = evidence.get("source")
            explanation = evidence.get("explanation")
            source_document_id = evidence.get("sourceDocumentId")
            if match_type not in {"skill", "semantic", "missing"}:
                continue
            if not all(isinstance(value, str) and value.strip() for value in [requirement, content, source, explanation]):
                continue
            parsed_evidences.append(
                {
                    "requirement": requirement.strip(),
                    "matchType": match_type,
                    "sourceDocumentId": source_document_id if isinstance(source_document_id, int) else None,
                    "content": content.strip(),
                    "source": source.strip(),
                    "explanation": explanation.strip(),
                }
            )

    return {
        "reason": reason.strip() if isinstance(reason, str) and reason.strip() else None,
        "evidences": parsed_evidences,
    }


async def generate_recommendation_reason_via_llm(
    job_posting: JobPosting,
    project: Project,
    recommendation: dict,
    source_documents: list[Any],
) -> dict | None:
    payload = build_recommendation_reason_payload(
        job_posting,
        project,
        recommendation,
        source_documents,
    )
    try:
        result = await complete_json(
            RECOMMENDATION_REASON_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError as exc:
        logger.warning("Recommendation reason LLM call failed: %s", exc.message)
        return None
    return parse_recommendation_reason(result)


RESUME_GENERATION_SYSTEM_PROMPT = (
    "You are a Korean technical resume writer. Generate resume sections tailored to the given "
    "job posting using only the selected projects and provided evidence. Do not invent metrics, "
    "achievements, tools, dates, or impact. Every concrete claim must be supported by project "
    "fields or evidenceIds. Emphasize requirements from the job posting, and clearly avoid "
    "unsupported skills. "
    'Respond with a single JSON object: {"summary": string, "sections": [{"sectionType": '
    'string, "projectId": number | null, "heading": string, "content": string, "evidenceIds": '
    'number[]}], "warnings": string[]}. '
    "Write in natural Korean resume style. Return JSON only."
)


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
            "rawText": job_posting.raw_text[:4000],
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
                        "sourceType": evidence.source_type,
                        "metadata": evidence.metadata_,
                    }
                    for evidence in evidence_by_project.get(project.id, [])
                ],
            }
            for project in projects
        ],
    }


def parse_resume_generation(result: dict) -> dict:
    summary = result.get("summary")
    sections = result.get("sections")
    warnings = result.get("warnings")
    safe_sections: list[dict] = []

    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                continue
            heading = section.get("heading")
            content = section.get("content")
            if not isinstance(heading, str) or not heading.strip():
                continue
            if not isinstance(content, str) or not content.strip():
                continue
            project_id = section.get("projectId")
            safe_sections.append(
                {
                    "sectionType": (
                        section.get("sectionType")
                        if isinstance(section.get("sectionType"), str) and section.get("sectionType").strip()
                        else "project"
                    ),
                    "projectId": project_id if isinstance(project_id, int) else None,
                    "heading": heading.strip(),
                    "content": content.strip(),
                    "evidenceIds": [
                        evidence_id
                        for evidence_id in section.get("evidenceIds", [])
                        if isinstance(evidence_id, int)
                    ]
                    if isinstance(section.get("evidenceIds"), list)
                    else [],
                }
            )

    return {
        "summary": summary.strip() if isinstance(summary, str) and summary.strip() else None,
        "sections": safe_sections,
        "warnings": json_list_to_strings(warnings),
    }


async def generate_resume_sections_via_llm(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
) -> dict | None:
    payload = build_resume_generation_payload(job_posting, projects, evidence_by_project)
    try:
        result = await complete_json(
            RESUME_GENERATION_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError as exc:
        logger.warning("Resume generation LLM call failed: %s", exc.message)
        return None
    return parse_resume_generation(result)


GAP_PROJECT_SUGGESTION_SYSTEM_PROMPT = (
    "You are a Korean technical mentor suggesting concrete portfolio projects to fill missing "
    "job-posting skills. Use the provided job posting, selected projects, evidence, and missing "
    "skills. Suggest practical, buildable projects that directly demonstrate the missing skills. "
    "Do not suggest vague projects like 'make a small service'; each suggestion must name a "
    "specific product or workflow and concrete features. Do not invent experience the user "
    "already has. "
    'Respond with a single JSON object: {"suggestedProjects": [{"title": string, '
    '"description": string, "targetSkills": string[], "reason": string}]}. '
    "Write in Korean. Return JSON only."
)


def build_gap_project_suggestion_payload(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
    missing_skills: list[str],
) -> dict:
    payload = build_resume_generation_payload(job_posting, projects, evidence_by_project)
    payload["task"] = "gap_project_suggestion"
    payload["missingSkills"] = missing_skills
    payload["instructions"] = [
        "Suggest one concrete project per missing skill unless one project naturally covers multiple missing skills.",
        "Each project must be specific enough that a student can start building it immediately.",
        "Focus on concrete features, data handled, APIs, infrastructure, or UI flows.",
        "Do not include estimated duration.",
    ]
    return payload


def parse_gap_project_suggestions(result: dict, missing_skills: list[str]) -> list[dict]:
    allowed_skills = {skill.casefold(): skill for skill in missing_skills}
    suggestions = result.get("suggestedProjects")
    safe_suggestions: list[dict] = []
    if not isinstance(suggestions, list):
        return safe_suggestions

    for suggestion in suggestions:
        if not isinstance(suggestion, dict):
            continue
        title = suggestion.get("title")
        description = suggestion.get("description")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(description, str) or not description.strip():
            continue

        target_skills = []
        if isinstance(suggestion.get("targetSkills"), list):
            for skill in suggestion["targetSkills"]:
                if not isinstance(skill, str):
                    continue
                skill_key = skill.casefold()
                canonical_skill = allowed_skills.get(skill_key)
                if canonical_skill is None:
                    canonical_skill = next(
                        (
                            missing_skill
                            for missing_key, missing_skill in allowed_skills.items()
                            if missing_key in skill_key or skill_key in missing_key
                        ),
                        None,
                    )
                if canonical_skill and canonical_skill not in target_skills:
                    target_skills.append(canonical_skill)
        if not target_skills:
            continue

        reason = suggestion.get("reason")
        safe_suggestions.append(
            {
                "title": title.strip(),
                "description": description.strip(),
                "targetSkills": target_skills,
                "reason": (
                    reason.strip()
                    if isinstance(reason, str) and reason.strip()
                    else f"{', '.join(target_skills)} 활용 경험을 보완하기 위한 프로젝트입니다."
                ),
            }
        )

    return safe_suggestions


async def generate_gap_project_suggestions_via_llm(
    job_posting: JobPosting,
    projects: list[Project],
    evidence_by_project: dict[int, list[Evidence]],
    missing_skills: list[str],
) -> list[dict]:
    if not missing_skills:
        return []

    payload = build_gap_project_suggestion_payload(
        job_posting,
        projects,
        evidence_by_project,
        missing_skills,
    )
    try:
        result = await complete_json(
            GAP_PROJECT_SUGGESTION_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError as exc:
        logger.warning("Gap project suggestion LLM call failed: %s", exc.message)
        return []
    return parse_gap_project_suggestions(result, missing_skills)


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
