"""Build knowledge graph from pipeline results."""

from utils.logger import get_logger


class KnowledgeGraphAgent:
    """Builds nodes+edges graph from all pipeline results."""

    COLORS = {
        "disease": "#ef4444",
        "mutation": "#f59e0b",
        "protein": "#0891b2",
        "structure": "#a78bfa",
        "drug": "#059669",
        "pocket": "#06b6d4",
        "paper": "#94a3b8",
        "trial": "#f97316",
    }

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete", extra={"keys_updated": list(result.keys())})
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"KnowledgeGraphAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        nodes, edges = [], []
        node_ids = {}

        def add_node(nid: str, label: str, ntype: str, **extra):
            if nid not in node_ids:
                node_ids[nid] = True
                nodes.append(
                    {
                        "id": nid,
                        "label": label,
                        "type": ntype,
                        "color": self.COLORS.get(ntype, "#666"),
                        **extra,
                    }
                )

        def add_edge(src: str, tgt: str, rel: str, **extra):
            edges.append({"source": src, "target": tgt, "relation": rel, **extra})

        ctx = state.get("mutation_context") or {}
        gene = ctx.get("gene", "")
        mutation = ctx.get("mutation", "")
        disease = ctx.get("disease_context", gene)

        if gene:
            add_node(f"gene_{gene}", gene, "mutation")
        if disease:
            add_node(f"disease_{disease}", disease, "disease")
        if gene and disease:
            add_edge(f"gene_{gene}", f"disease_{disease}", "found_in")

        for p in state.get("proteins", [])[:5]:
            pid = f"protein_{p.get('accession', p.get('protein_name', ''))}"
            add_node(pid, p.get("protein_name", "unknown"), "protein")
            if disease:
                add_edge(pid, f"disease_{disease}", "associated_with")

        for s in state.get("structures", [])[:3]:
            sid = f"struct_{s.get('pdb_id', '')}"
            add_node(sid, s.get("pdb_id", ""), "structure")
            for p in state.get("proteins", [])[:2]:
                pid = f"protein_{p.get('accession', p.get('protein_name', ''))}"
                add_edge(sid, pid, "structure_of")

        pocket = state.get("binding_pocket")
        if pocket:
            pocket_id = "pocket_main"
            add_node(pocket_id, "Binding Pocket", "pocket")
            for s in state.get("structures", [])[:1]:
                add_edge(pocket_id, f"struct_{s.get('pdb_id', '')}", "detected_in")

        for d in (state.get("docking_results") or [])[:5]:
            smi = d.get("smiles", "")[:20]
            did = f"drug_{smi}"
            add_node(did, smi + "...", "drug")
            for p in state.get("proteins", [])[:1]:
                pid = f"protein_{p.get('accession', p.get('protein_name', ''))}"
                add_edge(did, pid, "inhibits", binding_energy=d.get("binding_energy"))
            if pocket:
                add_edge(did, "pocket_main", "docks_at")

        for paper in state.get("literature", [])[:3]:
            pid = f"paper_{paper.get('pubmed_id', '')}"
            add_node(pid, paper.get("title", "")[:40], "paper")
            for p in state.get("proteins", [])[:1]:
                ppid = f"protein_{p.get('accession', p.get('protein_name', ''))}"
                add_edge(pid, ppid, "references")

        for trial in state.get("clinical_trials", [])[:3]:
            tid = f"trial_{trial.get('nct_id', '')}"
            add_node(tid, trial.get("nct_id", ""), "trial")
            if gene:
                add_edge(tid, f"gene_{gene}", "evaluates")
            if disease:
                add_edge(tid, f"disease_{disease}", "studying")

        return {"knowledge_graph": {"nodes": nodes, "edges": edges}}
