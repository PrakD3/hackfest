"""Generate toxicophore highlight images using RDKit rdMolDraw2D."""

import base64

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D


def generate_toxicophore_image(
    smiles: str,
    highlight_atoms: list[int],
    match_name: str,
    size: tuple[int, int] = (400, 300),
) -> str:
    """Returns base64-encoded SVG/PNG with problematic atoms highlighted red."""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return ""
        drawer = rdMolDraw2D.MolDraw2DSVG(size[0], size[1])
        drawer.drawOptions().addAtomIndices = False
        highlight_colors = {idx: (0.9, 0.2, 0.2) for idx in highlight_atoms}
        drawer.DrawMolecule(
            mol, highlightAtoms=highlight_atoms, highlightAtomColors=highlight_colors
        )
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()
        try:
            import cairosvg

            png_bytes = cairosvg.svg2png(bytestring=svg.encode())
            return base64.b64encode(png_bytes).decode()
        except ImportError:
            return base64.b64encode(svg.encode()).decode()
    except Exception:
        return ""
