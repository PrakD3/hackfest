"""ADMET utility functions."""


def lipinski_check(smiles: str) -> dict:
    """Run Lipinski Rule of Five check. Returns pass/fail + details."""
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, rdMolDescriptors

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"pass": False, "violations": 5, "reason": "Invalid SMILES"}
        mw = Descriptors.MolWt(mol)
        hbd = rdMolDescriptors.CalcNumHBD(mol)
        hba = rdMolDescriptors.CalcNumHBA(mol)
        logp = Descriptors.MolLogP(mol)
        rotb = rdMolDescriptors.CalcNumRotatableBonds(mol)
        violations = sum([mw > 500, hbd > 5, hba > 10, logp > 5, rotb > 10])
        return {
            "pass": violations <= 1,
            "mw": round(mw, 2),
            "hbd": hbd,
            "hba": hba,
            "logp": round(logp, 2),
            "rotb": rotb,
            "violations": violations,
        }
    except Exception as e:
        return {"pass": False, "violations": -1, "reason": str(e)}
