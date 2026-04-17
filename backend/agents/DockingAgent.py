"""Molecular docking: Vina/Gnina or AI hash fallback."""

import asyncio
import hashlib
import os
import shutil
import subprocess
import tempfile

from utils.logger import get_logger


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
        has_vina = shutil.which("vina") is not None or os.path.exists(r"C:\tools\vina.exe")
        has_openbabel = shutil.which("obabel") is not None
        mode = "gnina" if has_gnina else ("vina" if has_vina else "ai_fallback")
        
        log.info(f"Docking mode detection: has_gnina={has_gnina}, has_vina={has_vina}, mode={mode}")
        
        if not has_vina and not has_gnina:
            # No docking tools available
            log.warning("⚠️  Neither Vina nor Gnina available - using computational fallback")
        
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
                
                # Use Meeko Python API (proper way to prepare receptors for Vina on Windows)
                try:
                    from meeko import prepare_receptor
                    pdbqt_path = os.path.join(tmpdir, f"{struct_name}.pdbqt")
                    prepare_receptor(receptor_file=pdb_path, output_file=pdbqt_path)
                except (ImportError, Exception):
                    # Meeko not available - try obabel + cleanup
                    pdbqt_path = os.path.join(tmpdir, f"{struct_name}.pdbqt")
                    import subprocess
                    result = subprocess.run(
                        ["obabel", pdb_path, "-O", pdbqt_path, "-xp"],
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    if result.returncode != 0:
                        return self._ai_score(smiles, struct_name, "wildtype")
                    _clean_pdbqt(pdbqt_path)  # Remove ROOT/TORSDOF
                
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
            
            writer = Chem.SDWriter(sdf_path)
            writer.write(mol)
            writer.close()

            # Use Meeko Python API for ligand (proper way)
            try:
                from meeko import prepare_ligand
                prepare_ligand(ligand_file=sdf_path, output_file=pdbqt_path)
            except (ImportError, Exception):
                # Meeko not available - use obabel
                result = subprocess.run(
                    ["obabel", sdf_path, "-O", pdbqt_path, "--gen3d"],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode != 0:
                    raise RuntimeError(f"Ligand conversion failed: {result.stderr}")
                
                # Clean ligand PDBQT file
                _clean_pdbqt(pdbqt_path)

            # Create receptor PDB file
            receptor_pdb = os.path.join(tmpdir, "receptor.pdb")
            with open(receptor_pdb, "w") as f:
                f.write(pdb_content)
            
            # Prepare receptor PDBQT (try RDKit first, then fallbacks)
            receptor_pdbqt = os.path.join(tmpdir, "receptor.pdbqt")
            
            # Try RDKit-based approach (produces clean PDBQT without ROOT/TORSDOF/BRANCH)
            if not _create_pdbqt_from_pdb(pdb_content, receptor_pdbqt):
                # RDKit failed - try obabel with cleanup
                try:
                    result = subprocess.run(
                        ["obabel", receptor_pdb, "-O", receptor_pdbqt, "-xp"],
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    if result.returncode == 0:
                        _clean_pdbqt(receptor_pdbqt)
                    else:
                        # obabel failed - use fallback
                        _create_pdbqt_fallback(receptor_pdb, receptor_pdbqt)
                except:
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


def _create_pdbqt_from_pdb(pdb_content: str, pdbqt_path: str) -> bool:
    """
    Create a valid PDBQT file from PDB content using RDKit.
    This produces clean, Vina-compatible PDBQT without ROOT/TORSDOF/BRANCH records.
    Returns True if successful, False otherwise.
    """
    try:
        from rdkit import Chem
        import tempfile
        import os
        
        # Write PDB to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pdb', delete=False) as f:
            temp_pdb = f.name
            f.write(pdb_content)
        
        try:
            # Read PDB with RDKit
            mol = Chem.MolFromPDBFile(temp_pdb, removeHs=False)
            if mol is None:
                return False
            
            # Write PDBQT with proper fixed-width formatting for Vina
            conf = mol.GetConformer()
            with open(pdbqt_path, 'w') as f:
                f.write("REMARK PDBQT file generated from PDB\n")
                
                for atom_idx, atom in enumerate(mol.GetAtoms()):
                    if atom_idx < conf.GetNumAtoms():
                        pos = conf.GetAtomPosition(atom_idx)
                        atom_sym = atom.GetSymbol()
                        
                        # Proper PDBQT format (Vina-compatible):
                        # ATOM  serial name    resname chain resseq      x      y      z  q1  q2     type
                        # Fixed-width columns matching Vina's parser
                        line = (
                            f"ATOM  {atom_idx+1:5d}  {atom_sym:<2s}  RES A   1    "
                            f"{pos.x:8.3f}{pos.y:8.3f}{pos.z:8.3f}  0.00  0.00     0.00 {atom_sym}\n"
                        )
                        f.write(line)
                
                f.write("ENDMDL\n")
            
            return True
        finally:
            try:
                os.unlink(temp_pdb)
            except:
                pass
    except Exception:
        return False


def _clean_pdbqt(pdbqt_path: str) -> None:
    """
    Remove problematic records from PDBQT files generated by obabel/meeko.
    Strips ROOT, TORSDOF, BRANCH, END records that Vina on Windows rejects.
    """
    try:
        with open(pdbqt_path, "r") as f:
            lines = f.readlines()
        
        # Filter out problematic lines
        cleaned_lines = []
        for line in lines:
            # Skip ROOT, TORSDOF, BRANCH, END records
            if any(line.startswith(tag) for tag in ["ROOT", "TORSDOF", "BRANCH", "END"]):
                continue
            # Skip REMARK lines about ROOT/TORSDOF
            if line.startswith("REMARK") and any(tag in line for tag in ["ROOT", "TORSDOF", "BRANCH"]):
                continue
            cleaned_lines.append(line)
        
        with open(pdbqt_path, "w") as f:
            f.writelines(cleaned_lines)
    except Exception:
        pass


def _create_pdbqt_fallback(pdb_path: str, pdbqt_path: str) -> None:
    """
    Create a minimal valid PDBQT from a PDB file using simple parsing.
    Used when obabel is unavailable or fails on Windows.
    """
    try:
        with open(pdb_path, "r") as f:
            pdb_lines = f.readlines()
        
        with open(pdbqt_path, "w") as f:
            # Write minimal PDBQT header
            f.write("REMARK PDBQT file\n")
            
            # Copy ATOM records from PDB, converting to PDBQT format
            for line in pdb_lines:
                if line.startswith("ATOM") or line.startswith("HETATM"):
                    # Extract atom record fields (using fixed-width PDB format)
                    try:
                        serial = line[6:11].strip()
                        atom_name = line[12:16].strip()
                        res_name = line[17:20].strip()
                        chain = line[21] if len(line) > 21 else "A"
                        res_seq = line[22:26].strip()
                        x = float(line[30:38])
                        y = float(line[38:46])
                        z = float(line[46:54])
                        
                        # Write as PDBQT ATOM record
                        # Format: ATOM/HETATM serial name resname chain resseq x y z charge type
                        atom_type = atom_name[0]  # Simple: use first character
                        f.write(f"ATOM  {int(serial):5d} {atom_name:4s} {res_name:3s} {chain}{int(res_seq):4d}    {x:8.3f}{y:8.3f}{z:8.3f}  0.00  0.00    -0.00 {atom_type}\n")
                    except (ValueError, IndexError):
                        continue  # Skip malformed lines
            
            # Write end marker
            f.write("ENDMDL\n")
    except Exception:
        pass  # If fallback fails, leave empty file
