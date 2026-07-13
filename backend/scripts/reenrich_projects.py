"""Re-run LLM enrichment for already-collected GitHub projects.

By default, reuses the existing Evidence rows saved during collection, so it
does not re-fetch from GitHub or duplicate SourceDocument/Evidence records -
it only calls the LLM again and overwrites
project.role/description/skills/achievements.

Pass --refresh-readme to also re-fetch each project's README from GitHub
first and update its saved Evidence.content before re-enriching. This is
needed to backfill projects collected before MAX_EVIDENCE_CHARS was raised
from 1200 to 8000 - their stored Evidence.content is still truncated to the
old, smaller limit.

Usage:
    python -m scripts.reenrich_projects --github-username your-github-id
    python -m scripts.reenrich_projects --project-id 12 --project-id 13
    python -m scripts.reenrich_projects --all
    python -m scripts.reenrich_projects --all --refresh-readme
"""

import argparse
import asyncio
import json
from urllib.parse import urlparse

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.evidence import Evidence
from app.models.project import Project
from app.models.user import OAuthAccount
from app.routers.collection import (
    MAX_EVIDENCE_CHARS,
    _decrypt_oauth_token,
    _fetch_readme,
    _project_embedding_text,
    _try_create_embedding,
)
from app.services.llm_client import LLMError, complete_json
from app.services.llm_pipeline import (
    PROJECT_ENRICHMENT_SYSTEM_PROMPT,
    build_project_enrichment_payload,
    parse_project_enrichment,
)


def _full_name_from_source_url(source_url: str | None) -> str | None:
    if not source_url:
        return None
    path = urlparse(source_url).path.strip("/")
    return path or None


async def _refresh_readme_evidence(project: Project, evidences: list[Evidence], db) -> None:
    full_name = _full_name_from_source_url(project.source_url)
    if full_name is None:
        print(f"[warn] project {project.id} ({project.title}): no source_url, cannot refetch README")
        return

    account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == "github",
            OAuthAccount.user_id == project.user_id,
        )
    )
    if account is None or not account.access_token_encrypted:
        print(f"[warn] project {project.id} ({project.title}): no GitHub token for owner, skipping README refresh")
        return

    access_token = _decrypt_oauth_token(account.access_token_encrypted)
    readme_text = await _fetch_readme(access_token, full_name)
    if not readme_text.strip():
        return

    content = readme_text.strip()[:MAX_EVIDENCE_CHARS]
    for evidence in evidences:
        evidence.content = content
    db.flush()


async def reenrich(project: Project, db, refresh_readme: bool = False) -> bool:
    evidences = list(db.scalars(select(Evidence).where(Evidence.project_id == project.id)))
    if not evidences:
        print(f"[skip] project {project.id} ({project.title}): no evidence saved, nothing to enrich from")
        return False

    if refresh_readme:
        await _refresh_readme_evidence(project, evidences, db)

    payload = build_project_enrichment_payload(project, evidences)
    try:
        result = await complete_json(
            PROJECT_ENRICHMENT_SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
        )
    except LLMError as exc:
        print(f"[fail] project {project.id} ({project.title}): {exc.code} - {exc.message}")
        return False

    enrichment = parse_project_enrichment(result)

    if enrichment["role"] is not None:
        project.role = enrichment["role"]
    if enrichment["description"] is not None:
        project.description = enrichment["description"]
    if enrichment["skills"]:
        project.skills = enrichment["skills"]
    project.achievements = enrichment["achievements"]

    project.summary_text = _project_embedding_text(project)
    embedding = _try_create_embedding(project.summary_text)
    if embedding is not None:
        project.summary_embedding = embedding
    embedding_note = "embedding updated" if embedding is not None else "embedding skipped (no OPENROUTER_API_KEY?)"

    print(f"[ok] project {project.id} ({project.title}): role={project.role!r} skills={project.skills} ({embedding_note})")
    return True


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--github-username", help="Only re-enrich projects owned by this GitHub account")
    parser.add_argument(
        "--project-id",
        type=int,
        action="append",
        dest="project_ids",
        help="Re-enrich a specific project id (repeatable)",
    )
    parser.add_argument("--all", action="store_true", help="Re-enrich all github projects in the database")
    parser.add_argument(
        "--refresh-readme",
        action="store_true",
        help="Re-fetch each project's README from GitHub and update its saved Evidence.content first",
    )
    args = parser.parse_args()

    if not args.github_username and not args.project_ids and not args.all:
        parser.error("pass --github-username, --project-id, or --all")

    db = SessionLocal()
    try:
        query = select(Project).where(Project.source_type.in_(["github", "github_manual"]))
        if args.project_ids:
            query = query.where(Project.id.in_(args.project_ids))
        elif args.github_username:
            account = db.scalar(
                select(OAuthAccount).where(
                    OAuthAccount.provider == "github",
                    OAuthAccount.provider_username == args.github_username,
                )
            )
            if account is None:
                parser.error(f"no GitHub account found with username {args.github_username!r}")
            query = query.where(Project.user_id == account.user_id)

        projects = list(db.scalars(query))
        if not projects:
            print("No matching projects found.")
            return

        updated = 0
        for project in projects:
            if await reenrich(project, db, refresh_readme=args.refresh_readme):
                updated += 1
        db.commit()
        print(f"\nDone. {updated}/{len(projects)} project(s) re-enriched.")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
