"""GET /api/export/{session_id}?format=json|sdf|pdf."""

import io
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

router = APIRouter()


@router.get("/export/{session_id}")
async def export(session_id: str, format: str = "json"):
    from agents.OrchestratorAgent import _sessions

    state = _sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if format == "json":
        report = state.get("final_report", {})
        return JSONResponse(content=report)

    elif format == "sdf":
        docking = state.get("docking_results", [])
        lines = []
        for i, mol in enumerate(docking[:10]):
            smi = mol.get("smiles", "")
            lines.append(f"Compound_{i + 1}")
            lines.append("  Drug Discovery AI     3D")
            lines.append("")
            lines.append("  0  0  0  0  0  0  0  0  0  0999 V2000")
            lines.append("M  END")
            lines.append(f"> <SMILES>\n{smi}")
            lines.append(f"> <Binding_Energy>\n{mol.get('binding_energy', '')}")
            lines.append("$$$$")
        return Response(
            content="\n".join(lines),
            media_type="chemical/x-mdl-sdfile",
            headers={"Content-Disposition": f"attachment; filename={session_id}.sdf"},
        )

    elif format == "pdf":
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas

            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            c.setFont("Helvetica-Bold", 16)
            c.drawString(72, 800, "Drug Discovery AI — Report")
            c.setFont("Helvetica", 12)
            report = state.get("final_report", {})
            c.drawString(72, 780, f"Query: {state.get('query', '')}")
            c.drawString(72, 760, f"Session: {session_id}")
            leads = report.get("ranked_leads", [])
            y = 740
            for lead in leads[:5]:
                c.drawString(
                    72,
                    y,
                    f"Rank {lead['rank']}: {lead.get('smiles', '')[:50]} | Score: {lead.get('docking_score')}",
                )
                y -= 20
            c.save()
            return Response(
                content=buf.getvalue(),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={session_id}.pdf"},
            )
        except ImportError:
            raise HTTPException(status_code=501, detail="PDF export requires reportlab")

    raise HTTPException(status_code=400, detail=f"Unknown format: {format}")
