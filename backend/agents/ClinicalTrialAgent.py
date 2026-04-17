"""Query ClinicalTrials.gov API v2 for active trials."""

import httpx

from utils.logger import get_logger


class ClinicalTrialAgent:
    BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"ClinicalTrialAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_clinical_trials", True):
            return {}

        ctx = state.get("mutation_context") or {}
        gene = ctx.get("gene", "")
        mutation = ctx.get("mutation", "")
        query = f"{gene} {mutation}".strip() or ctx.get("disease_context", gene)
        if not query:
            return {}

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "query.cond": query,
                        "query.intr": gene,
                        "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING",
                        "pageSize": 5,
                        "format": "json",
                    },
                )
                if resp.status_code != 200:
                    return {
                        "warnings": ["ClinicalTrials.gov unavailable"],
                        "clinical_trials": [],
                    }

                trials = []
                for study in resp.json().get("studies", [])[:5]:
                    proto = study.get("protocolSection", {})
                    id_mod = proto.get("identificationModule", {})
                    status_mod = proto.get("statusModule", {})
                    arms_mod = proto.get("armsInterventionsModule", {})
                    nct = id_mod.get("nctId", "")
                    trials.append(
                        {
                            "nct_id": nct,
                            "title": id_mod.get("briefTitle", ""),
                            "phase": status_mod.get("phase", "N/A"),
                            "status": status_mod.get("overallStatus", ""),
                            "condition": query,
                            "interventions": [
                                iv.get("name", "") for iv in arms_mod.get("interventions", [])[:2]
                            ],
                            "url": f"https://clinicaltrials.gov/study/{nct}",
                        }
                    )
                return {"clinical_trials": trials}
        except Exception as exc:
            return {"warnings": [f"ClinicalTrialAgent: {exc}"], "clinical_trials": []}
