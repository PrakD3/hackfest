"""RDKit molecule utilities."""

import base64
import io


def mol_to_image_b64(smiles: str, size: tuple[int, int] = (300, 200)) -> str:
    """Convert SMILES to base64 PNG image."""
    try:
        from rdkit.Chem import Draw, MolFromSmiles

        mol = MolFromSmiles(smiles)
        if mol is None:
            return ""
        img = Draw.MolToImage(mol, size=size)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""


def validate_smiles(smiles: str) -> bool:
    """Return True if SMILES is valid."""
    try:
        from rdkit import Chem

        return Chem.MolFromSmiles(smiles) is not None
    except Exception:
        return False


def canonical_smiles(smiles: str) -> str | None:
    """Return canonical SMILES or None."""
    try:
        from rdkit import Chem

        mol = Chem.MolFromSmiles(smiles)
        return Chem.MolToSmiles(mol) if mol else None
    except Exception:
        return None
