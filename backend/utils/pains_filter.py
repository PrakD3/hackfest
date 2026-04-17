"""PAINS filter utilities."""


def check_pains(smiles: str) -> dict:
    """Check molecule for PAINS alerts. Returns flag + match info."""
    try:
        from rdkit import Chem
        from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"flagged": False, "match_name": "", "match_atoms": []}
        params = FilterCatalogParams()
        params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS)
        catalog = FilterCatalog(params)
        entry = catalog.GetFirstMatch(mol)
        if entry:
            matches = mol.GetSubstructMatches(entry.GetPattern())
            return {
                "flagged": True,
                "match_name": entry.GetDescription(),
                "match_atoms": list(matches[0]) if matches else [],
            }
        return {"flagged": False, "match_name": "", "match_atoms": []}
    except Exception:
        return {"flagged": False, "match_name": "", "match_atoms": []}
