# PRODUCTION DOCKING AGENT - COMPLETE DOCUMENTATION

## OVERVIEW

This is a **production-grade molecular docking system** that implements:

✓ **Real molecular docking** (AutoDock Vina only, no fallbacks)
✓ **Proper structure preparation** (clean, hydrogenate, validate)
✓ **Dual docking** (mutant + wildtype, compute ΔΔG)
✓ **Visualization files** (PDB, SDF, PDBQT for 3D viewing)
✓ **Strict validation** at every step
✓ **Clear error messages** (fail loud, not silent)

---

## ARCHITECTURE

### 4 Core Components

#### 1. **ProteinPreparer**
- Cleans PDB: removes water (HOH), ligands, heteroatoms
- Adds hydrogens (especially polar H for binding)
- Converts to PDBQT format (AutoDock-compatible)
- Validates output

**Steps:**
```
PDB file
  ↓ (remove water/ligands)
Cleaned PDB
  ↓ (add hydrogens)
Hydrogenated PDB
  ↓ (convert to PDBQT)
Valid PDBQT receptor
```

#### 2. **LigandPreparer**
- Validates SMILES syntax
- Generates 3D coordinates (RDKit)
- Optimizes geometry (UFF force field)
- Exports to PDBQT, PDB, SDF
- Validates coordinates (no NaN)

**Steps:**
```
SMILES string (e.g., "CCO")
  ↓ (RDKit parse + sanitize)
Validated molecule
  ↓ (EmbedMolecule → 3D)
3D structure
  ↓ (UFFOptimizeMolecule)
Optimized geometry
  ↓ (export multiple formats)
PDBQT + PDB + SDF files
```

#### 3. **VinaExecutor**
- Runs AutoDock Vina with proper parameters
- Parses binding affinity from output
- Validates energy values (must be -20 < ΔG < 0 kcal/mol)
- Reports uncertainty (±1.8 kcal/mol from literature)

#### 4. **DockingAgentProduction**
- Orchestrates the entire pipeline
- Manages mutations (mutant + WT)
- Generates visualization files
- Computes ΔΔG = ΔG_mutant - ΔG_WT
- Returns structured, validated results

---

## INPUT REQUIREMENTS

```python
state = {
    "pdb_content": "<PDB file content>",           # REQUIRED: protein structure
    "wt_pdb_content": "<PDB file content>",        # OPTIONAL: wildtype for comparison
    "generated_molecules": [
        {"smiles": "CCO", "compound_name": "mol1"},
        {"smiles": "CCc1ccccc1", "compound_name": "mol2"},
        ...
    ],
    "binding_pocket": {                             # REQUIRED: grid box for Vina
        "center_x": 10.5,
        "center_y": -5.2,
        "center_z": 8.3,
        "size_x": 20,
        "size_y": 20,
        "size_z": 20,
    },
    "structures": [
        {"pdb_id": "1A2B"}                          # PDB identifier
    ],
}
```

---

## OUTPUT FORMAT (STRICT)

### Per Molecule
```json
{
  "smiles": "CCO",
  "compound_name": "Ethanol",
  "mutant_affinity": -8.2,
  "mutant_affinity_formatted": "-8.2 ± 1.8 kcal/mol (Vina)",
  "wt_affinity": -5.1,
  "wt_affinity_formatted": "-5.1 ± 1.8 kcal/mol (Vina)",
  "delta_ddg": -3.1,
  "delta_ddg_formatted": "-3.1 ± 2.5 kcal/mol (ΔΔG)",
  "ligand_pdb": "/tmp/ligand_xyz.pdb",
  "ligand_sdf": "/tmp/ligand_xyz.sdf",
  "ligand_num_atoms": 9,
  "ligand_mw": 46.04,
  "complex_pdb": "/tmp/complex_mutant_0.pdb",
  "complex_pdbqt": "/tmp/vina_output.pdbqt",
  "is_validated": true,
  "is_real": true,
  "visualization": {
    "complex_file": "/tmp/complex_mutant_0.pdb",
    "ligand_file": "/tmp/ligand_xyz.sdf",
    "protein_file": "/path/to/receptor.pdbqt",
    "wt_protein_file": "/path/to/wt_receptor.pdbqt",
    "type": "complex"
  }
}
```

### Summary
```json
{
  "docking_results": [... array of results above ...],
  "docking_method": "AutoDock Vina (Real, Production)",
  "real_docking": true,
  "has_wt_comparison": true,
  "total_docked": 45
}
```

---

## KEY GUARANTEES

### ✓ Real Docking
- Uses actual AutoDock Vina executable
- No mathematical shortcuts
- No hash-based scoring
- No simulated affinities

### ✓ Proper Preparation
- **Protein:** Water removed, ligands removed, H added, validated
- **Ligand:** SMILES validated, 3D generated, geometry optimized, H added
- **Both:** Coordinates checked for NaN/Inf before docking

### ✓ Reproducible
- Same SMILES + structure = same energy (from Vina, not hash)
- Documented uncertainty (±1.8 kcal/mol)
- Literature-based (Vina validation studies)

### ✓ Dual Comparison
- Dock to **mutant** (target of interest)
- Dock to **wildtype** (control)
- Report ΔΔG for resistance/selectivity analysis

### ✓ Visualization Files
- **Complex PDB:** Protein + docked ligand in single file
- **Ligand SDF:** Small molecule for 3D viewers
- **Receptor PDBQT:** Protein structure (for reference)
- Compatible with Py3Dmol, NGL Viewer, 3Dmol.js

### ✓ Fail Loud
- Missing Vina? → Explicit error (not silent)
- Invalid SMILES? → Rejected (not skipped)
- Bad coordinates? → Error (not NaN values)
- Docking failure? → Logged (not ignored)

---

## DEPENDENCIES

### Required (Strict Check)
```bash
# AutoDock Vina
pip install vina

# Open Babel (structure conversion)
apt install openbabel          # Linux
brew install open-babel        # macOS
conda install -c conda-forge openbabel

# RDKit (molecule handling)
pip install rdkit
```

### Verify Installation
```bash
vina --version
obabel -V
python -c "from rdkit import Chem; print('OK')"
```

---

## USAGE

### Basic Integration
```python
from backend.agents.DockingAgent_Production import DockingAgent

docking_agent = DockingAgent()

# In your orchestration code:
result = await docking_agent.run(state)

# Check success
if "errors" in result:
    print("Docking failed:", result["errors"])
else:
    print(f"Docked {result['total_docked']} molecules")
    for mol_result in result["docking_results"]:
        print(f"  {mol_result['smiles']}: {mol_result['mutant_affinity']:.1f} kcal/mol")
```

### Advanced: Direct Component Usage
```python
from backend.agents.DockingAgent_Production import (
    ProteinPreparer, LigandPreparer, VinaExecutor
)

# Prepare receptor
preparer = ProteinPreparer()
receptor_pdbqt = await preparer.prepare(pdb_content, "1A2B", "/tmp")

# Prepare ligand
ligand_prep = LigandPreparer()
ligand_files = await ligand_prep.prepare("CCO", "/tmp")

# Run docking
vina = VinaExecutor()
dock_result = await vina.dock(
    receptor_pdbqt,
    ligand_files["pdbqt_path"],
    pocket={"center_x": 10, "center_y": 5, "center_z": 0, "size_x": 20, "size_y": 20, "size_z": 20},
    output_dir="/tmp"
)
```

---

## STRUCTURE PREPARATION DETAILS

### Protein Cleaning
**Removed:**
- Water molecules (HOH)
- Ligands (except if part of standard residue)
- Non-standard atoms
- Heteroatoms (MSE → MET conversion handled by Open Babel)

**Kept:**
- Standard amino acids (ALA, ARG, ASN, ... VAL)
- DNA/RNA (DA, DG, DC, DT, A, G, C, U)
- Disulfide bonds (CYS residues)

### Hydrogen Addition
- Uses Open Babel: adds polar hydrogens
- Essential for:
  - H-bonding calculations
  - Proper charge assignment
  - Vina scoring accuracy

### PDBQT Conversion
- Assigns partial charges (Gasteiger)
- Computes atom types (AutoDock)
- Declares rotatable bonds

**Validation:**
- File exists and non-empty
- Contains ROOT/ENDROOT (Vina requirement)
- Proper atom numbering

---

## LIGAND PREPARATION DETAILS

### 3D Geometry Generation
```python
from rdkit.Chem import AllChem

# Generate multiple conformers if desired
AllChem.EmbedMolecule(mol, randomSeed=42)  # Deterministic
AllChem.UFFOptimizeMolecule(mol)           # Force field optimization
```

**Algorithm:** ETKDG (Experimental-Torsion Knowledge Distance Geometry)
- Statistically-driven coordinate generation
- ~1-2 Å RMSD from crystal structures (typical)

### Geometry Validation
- Check all atoms have (x, y, z) coordinates
- Reject if NaN (coordinate generation failed)
- Reject if Inf (invalid geometry)
- Reject if atoms >1M Å from origin (data corruption)

### Multi-Format Export
| Format | Purpose |
|--------|---------|
| PDBQT | AutoDock Vina input (atom types, charges) |
| PDB | General molecular viewer input |
| SDF | Ligand-specific format (100% fidelity) |

---

## VINA EXECUTION PARAMETERS

### Grid Box (Search Space)
```
center_x, center_y, center_z = binding pocket center
size_x, size_y, size_z ≤ 20 Å (Vina limit)
```

### Docking Parameters
```
--exhaustiveness 8      (reasonable precision, reasonable time)
--num_modes 9           (9 binding modes in output)
```

### Output Parsing
- Reads Vina text output
- Extracts **mode 1** (best binding pose)
- Validates energy: -20 < ΔG < 0 kcal/mol
- Returns binding affinity in kcal/mol

---

## ERROR HANDLING

### Dependency Missing
```
DOCKING UNAVAILABLE - Missing dependencies:
  ✗ vina (AutoDock Vina)
  ✗ obabel (Open Babel)

Install with:
  pip install rdkit vina
  apt install openbabel
```

### Invalid SMILES
```
SMILES parse failed: "CCCC(C" ← unbalanced parens
Molecule rejected, skipped
```

### Docking Failure
```
Vina execution FAILED
Error: [Vina stderr output]
```

### Coordinate Error
```
NaN coordinates found in "CCO" at atom 2
3D generation failed, molecule rejected
```

---

## VALIDATION CHECKLIST

Before deployment:

- [ ] `vina --version` shows version (not "command not found")
- [ ] `obabel -V` shows version
- [ ] `python -c "from rdkit import Chem"` succeeds
- [ ] Run test docking (see below)
- [ ] Verify output contains `"is_real": true`
- [ ] Verify output contains `"real_docking": true`
- [ ] Test with wildtype (verify ΔΔG computed)
- [ ] Verify visualization files exist and are readable

---

## TEST PROTOCOL

### Minimal Test
```python
import asyncio
from backend.agents.DockingAgent_Production import DockingAgent

async def test():
    docking = DockingAgent()
    
    state = {
        "pdb_content": "<valid PDB content>",
        "generated_molecules": [
            {"smiles": "CCO", "compound_name": "test1"},
            {"smiles": "CC(C)C", "compound_name": "test2"},
        ],
        "binding_pocket": {
            "center_x": 0, "center_y": 0, "center_z": 0,
            "size_x": 20, "size_y": 20, "size_z": 20,
        },
        "structures": [{"pdb_id": "test"}],
    }
    
    result = await docking.run(state)
    
    # Verify
    assert "errors" not in result or result["errors"] == []
    assert result["real_docking"] == True
    assert len(result["docking_results"]) > 0
    
    # Check first result
    mol = result["docking_results"][0]
    assert mol["is_real"] == True
    assert -20 < mol["mutant_affinity"] < 0
    assert os.path.exists(mol["ligand_pdb"])
    assert os.path.exists(mol["complex_pdb"])
    
    print("✓ All checks passed")

asyncio.run(test())
```

---

## FILES LOCATION

| File | Purpose |
|------|---------|
| `DockingAgent_Production.py` | Main implementation |
| `DockingAgent_v4_strict.py` | Legacy strict version (reference) |
| `SelectivityAgent_v2_strict.py` | Off-target docking (also real) |

---

## INTEGRATION STEPS

1. **Update imports** in OrchestratorAgent.py:
   ```python
   from backend.agents.DockingAgent_Production import DockingAgent
   ```

2. **Install dependencies:**
   ```bash
   pip install rdkit vina
   apt install openbabel
   ```

3. **Run test** (see TEST PROTOCOL above)

4. **Deploy** and monitor logs for:
   - "DockingAgent (PRODUCTION) - Starting"
   - "✓ All dependencies available"
   - "Successfully docked N molecules"

---

## PERFORMANCE

- **Per molecule:** ~10-30 seconds (typical)
- **50 molecules:** ~10-15 minutes
- **Dual docking (mutant+WT):** ~2x time

### Parallelization Opportunity
Current: Sequential docking
Future: Batch Vina calls if implementing 1000s of molecules

---

## REFERENCES

- [AutoDock Vina Paper](http://vina.scripps.edu/) (Trott & Olson 2010)
- [Vina Validation](https://academic.oup.com/nar/article/49/W1/W465/6287488) (±1.8 kcal/mol uncertainty)
- [RDKit 3D Generation](https://www.rdkit.org/docs/Cookbook.html#3d-conformer-generation)
- [Open Babel PDBQT](http://openbabel.org/wiki/PDBQT)

---

**Version:** 1.0 Production
**Status:** Ready for deployment
**Last Updated:** 2024
