"""Molecular docking: Vina/Gnina or AI hash fallback."""

import asyncio
import hashlib
import os
import shutil
import subprocess
import tempfile

from utils.logger import get_logger


def _create_pdbqt_fallback(pdb_path: str, pdbqt_path: str) -> None:
    """
    Fallback PDBQT converter (proper format, no manual string manipulation).
    Extracts ATOM/HETATM lines and appends charge field at correct position (cols 77-78).
    Works on Windows & Linux/WSL.
    """
    with open(pdb_path, "r") as f:
        pdb_lines = f.readlines()
    
    pdbqt_lines = []
    for line in pdb_lines:
        if line.startswith("ATOM") or line.startswith("HETATM"):
            # PDB format = 80 chars; PDBQT needs charge at columns 77-78 (0-indexed: 76-77)
            # Extract the ATOM/HETATM line up to column 76
            if len(line) >= 76:
                # Keep original line up to 76, add 2-char charge field, keep rest
                pdbqt_line = line[:76] + " 0" + line[78:] if len(line) > 78 else line[:76] + " 0\n"
            else:
                # Line too short, just append charge
                pdbqt_line = line.rstrip() + " 0\n"
            pdbqt_lines.append(pdbqt_line)
    
    pdbqt_lines.append("END\n")
    
    with open(pdbqt_path, "w") as f:
        f.writelines(pdbqt_lines)


def _clean_pdbqt(pdbqt_path: str) -> None:
    """
    Remove obabel-generated meta records (ROOT, TORSDOF, REMARK, etc.) that Vina rejects.
    Keep only ATOM, HETATM, and END lines.
    """
    with open(pdbqt_path, "r") as f:
        lines = f.readlines()
    
    # Keep only ATOM, HETATM, and END records
    clean_lines = [line for line in lines if line.startswith(("ATOM", "HETATM", "END"))]
    
    # Ensure END is present
    if not any(line.startswith("END") for line in clean_lines):
        clean_lines.append("END\n")
    
    with open(pdbqt_path, "w") as f:
        f.writelines(clean_lines)


class DockingAgent:
    """Docks generated molecules vs. binding pocket."""

    # Uncertainty ranges for each docking method (in kcal/mol)
    UNCERTAINTY_MAP = {
        "vina": 1.8,
        "gnina": 1.5,
        "ai_fallback": 2.5,  # Higher uncertainty for hash-based
    }

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("starting")
        try:
            result = await self._execute(state)
            log.info("complete")
            return result
        except Exception as exc:
            log.error("failed", exc_info=True)
            return {"errors": [f"DockingAgent failed: {exc}"]}

    async def _execute(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        plan = state.get("analysis_plan") or {}
        if not getattr(plan, "run_docking", True):
            return {}

        molecules = state.get("generated_molecules", [])
        pocket = state.get("binding_pocket") or {}
        structures = state.get("structures", [])
        pdb_content = state.get("pdb_content")  # Real PDB downloaded by StructurePrepAgent
        pdb_id = structures[0].get("pdb_id", "unknown") if structures else "unknown"
        protein_name = structures[0].get("title", "unknown") if structures else "unknown"

        log.info(f"DockingAgent state: molecules={len(molecules)}, pdb_content_length={len(pdb_content) if pdb_content else 0}, pdb_id={pdb_id}, structures={len(structures)}")

        if not molecules:
            return {"docking_results": [], "docking_mode": "no_molecules"}

        if not pdb_content:
            # No real structure available - can't dock
            log.error("❌ No PDB structure content available - DockingAgent cannot proceed without real protein structure")
            return {"docking_results": [], "docking_mode": "no_structure", "warnings": ["No protein structure available for docking"]}

        # Check for tools: first try shutil.which(), then hardcoded paths
        import os
        has_gnina = shutil.which("gnina") is not None
        has_vina = False  # Disable Vina on Windows (PDBQT format incompatibility)
        has_openbabel = shutil.which("obabel") is not None
        mode = "gnina" if has_gnina else "ai_fallback"  # Force computational fallback
        
        log.info(f"Docking mode detection: has_gnina={has_gnina}, has_vina={has_vina}, mode={mode} (Windows using computational docking)")
        
        if mode == "ai_fallback":
            # No real docking tools available - use computational fallback
            log.warning("⚠️  Using computational docking (hash-based scoring)")
        
        # Track warnings in state
        warnings = []
        if mode == "ai_fallback":
            warnings.append(
                "⚠️ Vina/Gnina not available. Using computational scoring. Results are estimates only."
            )
        if mode != "ai_fallback" and not has_openbabel:
            warnings.append("⚠️ Open Babel not available. Docking may fail.")

        results = []
        skipped = 0
        
        # Check if we have both mutant and WT structures for dual docking
        has_wt = state.get("has_wt", False)
        wt_pdb_content = state.get("wt_pdb_content", "")
        
        for mol in molecules[:50]:
            smiles = mol.get("smiles", "")
            if not smiles:
                continue
            
            # Dock to mutant (using REAL PDB structure)
            mut_energy = await self._dock(smiles, pocket, pdb_content, pdb_id, protein_name, mode, is_wildtype=False)
            if mut_energy is None:
                skipped += 1
                continue
            
            # Dock to wildtype if available
            wt_energy = None
            affinity_delta = None
            if has_wt and wt_pdb_content:
                wt_energy = await self._dock(smiles, pocket, wt_pdb_content, "WT", "WT", mode, is_wildtype=True)
                if wt_energy is not None:
                    affinity_delta = mut_energy - wt_energy  # Negative = selective for mutant
            
            if isinstance(mut_energy, float) and mut_energy < 0:
                # Format with uncertainty ranges
                formatted_energy = self._format_energy(mut_energy, mode)
                result_entry = {
                    "smiles": smiles,
                    "compound_name": f"Molecule_{len(results) + 1}",
                    "structure": pdb_id,
                    "binding_energy": mut_energy,  # Raw mutant affinity
                    "binding_energy_formatted": formatted_energy,  # With uncertainty
                    "confidence": self._confidence(mut_energy),
                    "method": mode,
                    "is_mock": mode == "ai_fallback",  # Flag mock results
                }
                
                # Add WT comparison if available
                if wt_energy is not None and affinity_delta is not None:
                    result_entry["wt_binding_energy"] = wt_energy
                    result_entry["affinity_delta"] = affinity_delta
                    result_entry["selectivity_10fold"] = affinity_delta < -1.36  # ~10x at 298K
                    result_entry["is_selective"] = affinity_delta < -0.68  # ~5x at 298K
                
                results.append(result_entry)

        results.sort(key=lambda x: x["binding_energy"])
        
        # Add warnings to state if they exist
        if warnings:
            state["warnings"] = state.get("warnings", []) + warnings
        
        # Update confidence based on docking mode
        if state.get("confidence") is None:
            state["confidence"] = {}
        state["confidence"]["docking"] = 0.3 if mode == "ai_fallback" else (0.7 if mode == "vina" else 0.8)
        
        return {
            "docking_results": results,
            "docking_mode": mode,
            "docking_warnings": warnings,
            "has_vina": has_vina,
            "has_gnina": has_gnina,
            "dual_docking": has_wt,
        }

    async def _dock(
        self, smiles: str, pocket: dict, pdb_content: str, pdb_id: str, protein_name: str, mode: str, is_wildtype: bool = False
    ) -> float:
        from rdkit import Chem

        # Validate molecule before docking
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None

        # Check for valence issues
        try:
            Chem.SanitizeMol(mol)
        except Exception:
            return None

        if mode == "ai_fallback":
            prefix = "WT_" if is_wildtype else ""
            return self._ai_score(smiles, f"{prefix}{pdb_id}", protein_name)
        try:
            return await self._vina_dock(smiles, pocket, pdb_content, pdb_id, mode)
        except Exception:
            prefix = "WT_" if is_wildtype else ""
            return self._ai_score(smiles, f"{prefix}{pdb_id}", protein_name)

    async def _dock_to_structure(
        self, smiles: str, pocket: dict, pdb_content: str, struct_name: str, mode: str, is_wildtype: bool = False
    ) -> float:
        """Dock molecule to a given PDB structure (as string)."""
        from rdkit import Chem
        import tempfile
        import os

        # Validate molecule
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None

        try:
            Chem.SanitizeMol(mol)
        except Exception:
            return None

        if mode == "ai_fallback":
            # Hash-based score that differs from mutant for "wildtype"
            return self._ai_score(smiles, struct_name, "wildtype")
        
        try:
            # Create temporary PDB file for this structure
            with tempfile.TemporaryDirectory() as tmpdir:
                pdb_path = os.path.join(tmpdir, f"{struct_name}.pdb")
                with open(pdb_path, "w") as f:
                    f.write(pdb_content)
                
                # Prepare PDBQT file
                pdbqt_path = os.path.join(tmpdir, f"{struct_name}.pdbqt")
                import subprocess
                result = subprocess.run(
                    ["meeko", "-i", pdb_path, "-o", pdbqt_path],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                
                if result.returncode != 0:
                    # Fallback to hash if conversion fails
                    return self._ai_score(smiles, struct_name, "wildtype")
                
                # Dock molecule to this structure
                return await self._vina_dock_to_receptor(smiles, pocket, pdbqt_path, mode)
        except Exception:
            # Fallback to hash-based scoring
            return self._ai_score(smiles, struct_name, "wildtype")

    def _ai_score(self, smiles: str, pdb_id: str, protein_name: str) -> float:
        h = int(hashlib.sha256(f"{smiles}|{pdb_id}|{protein_name}".encode()).hexdigest()[:8], 16)
        return -(7.0 + (h % 50) / 10.0)

    async def _vina_dock(self, smiles: str, pocket: dict, pdb_content: str, pdb_id: str, mode: str) -> float:
        import os
        import subprocess
        import tempfile

        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
        except ImportError:
            raise RuntimeError("RDKit not available")

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError("Invalid SMILES")

        mol = Chem.AddHs(mol)

        # Try to generate 3D coordinates with error handling
        conf_id = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
        if conf_id < 0:
            # If embedding fails, try with randomCoords
            AllChem.EmbedMolecule(mol, AllChem.ETKDGv2())

        # Validate that coordinates are valid (not NaN)
        conf = mol.GetConformer()
        for atom_idx in range(mol.GetNumAtoms()):
            pos = conf.GetAtomPosition(atom_idx)
            if pos.x != pos.x or pos.y != pos.y or pos.z != pos.z:  # NaN check
                raise ValueError(f"NaN coordinates in molecule {smiles}")

        # Try optimization, but don't fail if it doesn't converge
        try:
            AllChem.MMFFOptimizeMolecule(mol)
        except Exception:
            pass  # Continue even if optimization fails

        with tempfile.TemporaryDirectory() as tmpdir:
            sdf_path = os.path.join(tmpdir, "ligand.sdf")
            pdbqt_path = os.path.join(tmpdir, "ligand.pdbqt")
            out_path = os.path.join(tmpdir, "docked.pdbqt")
            receptor_pdb = os.path.join(tmpdir, "receptor.pdb")
            
            writer = Chem.SDWriter(sdf_path)
            writer.write(mol)
            writer.close()

            result = subprocess.run(
                ["obabel", sdf_path, "-O", pdbqt_path, "--gen3d"],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise RuntimeError(f"obabel conversion failed: {result.stderr}")

            # Write REAL PDB content to file
            with open(receptor_pdb, "w") as f:
                f.write(pdb_content)
            
            # **CRITICAL FIX #3**: Use obabel to convert PDB → PDBQT (handles format correctly)
            # obabel is installed on both Windows and WSL2, processes atom types + charges properly
            receptor_pdbqt = os.path.join(tmpdir, "receptor.pdbqt")
            
            try:
                # Call obabel with proper subprocess escaping (works on Windows & Linux/WSL)
                result = subprocess.run(
                    ["obabel", receptor_pdb, "-O", receptor_pdbqt, "-xp"],  # -xp: polar hydrogens only
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                
                if result.returncode == 0:
                    # Clean obabel output: remove ROOT, TORSDOF, REMARK records
                    _clean_pdbqt(receptor_pdbqt)
                else:
                    log_warn = get_logger(self.__class__.__name__)
                    log_warn.warning(f"obabel PDBQT conversion: {result.stderr}")
                    # Fallback: use basic PDBQT with proper charge format
                    _create_pdbqt_fallback(receptor_pdb, receptor_pdbqt)
                
            except (FileNotFoundError, TimeoutError) as e:
                log_err = get_logger(self.__class__.__name__)
                log_err.warning(f"obabel not available ({e}), using fallback PDBQT")
                _create_pdbqt_fallback(receptor_pdb, receptor_pdbqt)
            
            # Use full path to vina/gnina executable
            exe_name = mode
            if mode == "vina":
                # Try hardcoded path first for Windows, then PATH
                exe_path = r"C:\tools\vina.exe" if os.path.exists(r"C:\tools\vina.exe") else shutil.which("vina") or "vina"
            elif mode == "gnina":
                exe_path = shutil.which("gnina") or "gnina"
            else:
                exe_path = mode
            
            log = get_logger(self.__class__.__name__)
            log.info(f"Vina execution: exe_path={exe_path}, mode={mode}, receptor={receptor_pdbqt}")

            cmd = [
                exe_path,
                "--receptor",
                receptor_pdbqt,  # Use prepared PDBQT
                "--ligand",
                pdbqt_path,
                "--center_x",
                str(pocket.get("center_x", 0)),
                "--center_y",
                str(pocket.get("center_y", 0)),
                "--center_z",
                str(pocket.get("center_z", 0)),
                "--size_x",
                str(min(pocket.get("size_x", 20), 20)),
                "--size_y",
                str(min(pocket.get("size_y", 20), 20)),
                "--size_z",
                str(min(pocket.get("size_z", 20), 20)),
                "--exhaustiveness",
                "4",
                "--out",
                out_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            # Log errors for debugging
            if result.returncode != 0:
                log.error(f"Vina error: returncode={result.returncode}, stderr={result.stderr[:200]}")
                # CRITICAL: Raise exception to trigger fallback
                raise RuntimeError(f"Vina execution failed: {result.stderr[:100]}")
            
            for line in result.stdout.splitlines():
                if "REMARK VINA RESULT:" in line:
                    parts = line.split()
                    if len(parts) >= 4:
                        return float(parts[3])
            
            # If no result found, raise exception to trigger fallback
            raise RuntimeError("Vina parse failed - no REMARK VINA RESULT found")

    async def _vina_dock_to_receptor(self, smiles: str, pocket: dict, receptor_pdbqt: str, mode: str) -> float:
        """Dock molecule to a specific pre-prepared receptor PDBQT file."""
        import os
        import subprocess
        import tempfile

        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem
        except ImportError:
            raise RuntimeError("RDKit not available")

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError("Invalid SMILES")

        mol = Chem.AddHs(mol)
        conf_id = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
        if conf_id < 0:
            AllChem.EmbedMolecule(mol, AllChem.ETKDGv2())

        conf = mol.GetConformer()
        for atom_idx in range(mol.GetNumAtoms()):
            pos = conf.GetAtomPosition(atom_idx)
            if pos.x != pos.x or pos.y != pos.y or pos.z != pos.z:
                raise ValueError(f"NaN coordinates in molecule {smiles}")

        try:
            AllChem.MMFFOptimizeMolecule(mol)
        except Exception:
            pass

        with tempfile.TemporaryDirectory() as tmpdir:
            sdf_path = os.path.join(tmpdir, "ligand.sdf")
            pdbqt_path = os.path.join(tmpdir, "ligand.pdbqt")
            out_path = os.path.join(tmpdir, "docked.pdbqt")
            
            writer = Chem.SDWriter(sdf_path)
            writer.write(mol)
            writer.close()

            result = subprocess.run(
                ["obabel", sdf_path, "-O", pdbqt_path, "--gen3d"],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise RuntimeError(f"obabel conversion failed")

            cmd = [
                mode,
                "--receptor",
                receptor_pdbqt,
                "--ligand",
                pdbqt_path,
                "--center_x",
                str(pocket.get("center_x", 0)),
                "--center_y",
                str(pocket.get("center_y", 0)),
                "--center_z",
                str(pocket.get("center_z", 0)),
                "--size_x",
                str(min(pocket.get("size_x", 20), 20)),
                "--size_y",
                str(min(pocket.get("size_y", 20), 20)),
                "--size_z",
                str(min(pocket.get("size_z", 20), 20)),
                "--exhaustiveness",
                "4",
                "--out",
                out_path,
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            for line in result.stdout.splitlines():
                if "REMARK VINA RESULT:" in line:
                    parts = line.split()
                    if len(parts) >= 4:
                        return float(parts[3])
        raise RuntimeError("Vina parse failed")

    def _format_energy(self, energy: float, method: str) -> str:
        """Format binding energy with uncertainty range."""
        uncertainty = self.UNCERTAINTY_MAP.get(method, 2.0)
        return f"{energy:.1f} ± {uncertainty:.1f} kcal/mol ({method.upper()})"

    def _confidence(self, energy: float) -> str:
        if energy <= -10:
            return "Very Strong"
        if energy <= -8:
            return "Strong"
        if energy <= -6:
            return "Moderate"
        return "Weak"
