"""
STRICT DOCKING: Real AutoDock Vina execution ONLY.

NO FALLBACKS. NO FAKE SCORES.
If real docking is unavailable → FAIL LOUDLY with clear error.
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from utils.logger import get_logger


class DockingAgent:
    """Performs REAL molecular docking using AutoDock Vina only."""

    # Strict validation
    REQUIRED_TOOLS = {
        "vina": "AutoDock Vina (required for docking)",
        "obabel": "Open Babel (required for SMILES → PDBQT conversion)",
    }

    # Real uncertainty ranges from Vina literature
    UNCERTAINTY = {
        "vina": 1.8,  # ±1.8 kcal/mol from Vina validation studies
    }

    async def run(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        log.info("DockingAgent: REAL DOCKING ONLY (no fallbacks)")
        
        try:
            # STRICT: Check dependencies before any execution
            self._check_dependencies(log)
            
            result = await self._execute(state)
            log.info("DockingAgent complete")
            return result
        except Exception as exc:
            log.error(f"DockingAgent failed: {exc}", exc_info=True)
            return {"errors": [str(exc)]}

    def _check_dependencies(self, log):
        """Verify ALL required tools are available. FAIL if missing."""
        missing = []
        
        for tool, description in self.REQUIRED_TOOLS.items():
            path = shutil.which(tool)
            if path is None:
                missing.append(f"{tool} ({description})")
            else:
                log.info(f"✓ Found {tool}: {path}")
        
        if missing:
            error_msg = (
                f"REAL DOCKING UNAVAILABLE\n\n"
                f"Missing required tools:\n"
            )
            for tool in missing:
                error_msg += f"  • {tool}\n"
            error_msg += (
                f"\nInstall with:\n"
                f"  pip install vina\n"
                f"  apt install openbabel (or brew install open-babel)\n\n"
                f"This pipeline performs ONLY real molecular docking.\n"
                f"No fallbacks or simulated results are available.\n"
            )
            raise RuntimeError(error_msg)

    async def _execute(self, state: dict) -> dict:
        log = get_logger(self.__class__.__name__)
        plan = state.get("analysis_plan") or {}
        
        if not getattr(plan, "run_docking", True):
            log.info("Docking skipped (plan)")
            return {}

        molecules = state.get("generated_molecules", [])
        pocket = state.get("binding_pocket") or {}
        structures = state.get("structures", [])
        
        if not molecules:
            return {"docking_results": [], "docking_mode": "vina"}

        if not pocket:
            raise RuntimeError(
                "CANNOT DOCK: No binding pocket available\n"
                "Pocket detection must succeed before docking."
            )

        pdb_id = structures[0].get("pdb_id", "unknown") if structures else "unknown"
        
        # Get protein PDBQT (receptor)
        pdb_pdbqt_path = await self._prepare_receptor_pdbqt(
            state.get("pdb_content"), pdb_id
        )
        
        # Dock each molecule to mutant (and WT if available)
        results = []
        has_wt = state.get("has_wt", False)
        wt_pdbqt_path = None
        
        if has_wt and state.get("wt_pdb_content"):
            wt_pdbqt_path = await self._prepare_receptor_pdbqt(
                state.get("wt_pdb_content"), f"WT_{pdb_id}"
            )
        
        for mol in molecules[:50]:
            smiles = mol.get("smiles", "")
            if not smiles:
                continue
            
            # Validate molecule
            if not self._validate_smiles(smiles, log):
                log.warning(f"REJECTED molecule (invalid SMILES): {smiles}")
                continue
            
            # Dock to mutant
            try:
                mut_energy = await self._dock_molecule(
                    smiles, pocket, pdb_pdbqt_path, "mutant"
                )
            except Exception as e:
                log.error(f"FAILED to dock {smiles} to mutant: {e}")
                continue  # Skip this molecule
            
            # Dock to WT if available
            wt_energy = None
            affinity_delta = None
            
            if has_wt and wt_pdbqt_path:
                try:
                    wt_energy = await self._dock_molecule(
                        smiles, pocket, wt_pdbqt_path, "wildtype"
                    )
                    affinity_delta = mut_energy - wt_energy
                except Exception as e:
                    log.warning(f"WT docking failed for {smiles}: {e}")
                    # Don't report ΔΔG if WT docking failed
            
            # Record result
            result_entry = {
                "smiles": smiles,
                "compound_name": f"Molecule_{len(results) + 1}",
                "mutant_affinity": mut_energy,
                "mutant_affinity_formatted": f"{mut_energy:.1f} ± {self.UNCERTAINTY['vina']} kcal/mol (Vina)",
                "is_valid": True,
            }
            
            if wt_energy is not None and affinity_delta is not None:
                result_entry["wt_affinity"] = wt_energy
                result_entry["wt_affinity_formatted"] = f"{wt_energy:.1f} ± {self.UNCERTAINTY['vina']} kcal/mol (Vina)",
                result_entry["delta_ddg"] = affinity_delta,
                result_entry["delta_ddg_formatted"] = f"{affinity_delta:.1f} ± {self.UNCERTAINTY['vina']} kcal/mol (ΔΔG)",
            
            results.append(result_entry)
        
        # Sort by mutant affinity (most negative = best)
        results.sort(key=lambda x: x["mutant_affinity"])
        
        log.info(f"Docked {len(results)} valid molecules")
        
        if state.get("confidence") is None:
            state["confidence"] = {}
        state["confidence"]["docking"] = 0.9  # Real docking = high confidence
        
        return {
            "docking_results": results,
            "docking_mode": "vina",
            "docking_method": "AutoDock Vina (real execution)",
            "real_docking": True,
            "has_wt_comparison": has_wt and wt_pdbqt_path is not None,
        }

    def _validate_smiles(self, smiles: str, log) -> bool:
        """Validate SMILES string. Return False if invalid."""
        from rdkit import Chem
        
        try:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return False
            Chem.SanitizeMol(mol)
            return True
        except Exception as e:
            log.debug(f"SMILES validation failed for {smiles}: {e}")
            return False

    async def _prepare_receptor_pdbqt(self, pdb_content: str, pdb_id: str) -> str:
        """Convert PDB → PDBQT using Open Babel. Fail if conversion fails."""
        log = get_logger(self.__class__.__name__)
        
        if not pdb_content:
            raise RuntimeError(f"Empty PDB content for {pdb_id}")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            pdb_path = os.path.join(tmpdir, f"{pdb_id}.pdb")
            pdbqt_path = os.path.join(tmpdir, f"{pdb_id}.pdbqt")
            
            # Write PDB file
            with open(pdb_path, "w") as f:
                f.write(pdb_content)
            
            if not os.path.exists(pdb_path):
                raise RuntimeError(f"Failed to write PDB file: {pdb_path}")
            
            # Convert to PDBQT
            cmd = ["obabel", pdb_path, "-O", pdbqt_path, "-xh"]
            log.info(f"Converting PDB → PDBQT: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
            )
            
            if result.returncode != 0:
                raise RuntimeError(
                    f"Open Babel conversion FAILED for {pdb_id}\n"
                    f"Command: {' '.join(cmd)}\n"
                    f"Error: {result.stderr}"
                )
            
            if not os.path.exists(pdbqt_path):
                raise RuntimeError(f"PDBQT file not created: {pdbqt_path}")
            
            # Copy to persistent location
            output_path = f"/tmp/{pdb_id}_receptor.pdbqt"
            shutil.copy(pdbqt_path, output_path)
            log.info(f"✓ Receptor PDBQT: {output_path}")
            
            return output_path

    async def _dock_molecule(
        self, smiles: str, pocket: dict, receptor_pdbqt: str, struct_type: str
    ) -> float:
        """
        Dock molecule to receptor using AutoDock Vina.
        
        Returns:
            binding_affinity (float, kcal/mol): Negative value
        
        Raises:
            RuntimeError: If docking fails or output cannot be parsed
        """
        log = get_logger(self.__class__.__name__)
        
        # Prepare ligand PDBQT
        ligand_pdbqt = await self._prepare_ligand_pdbqt(smiles)
        
        if not os.path.exists(receptor_pdbqt):
            raise RuntimeError(f"Receptor file not found: {receptor_pdbqt}")
        
        if not os.path.exists(ligand_pdbqt):
            raise RuntimeError(f"Ligand file not found: {ligand_pdbqt}")
        
        # Run Vina
        with tempfile.TemporaryDirectory() as tmpdir:
            output_pdbqt = os.path.join(tmpdir, "docked_output.pdbqt")
            
            cmd = [
                "vina",
                "--receptor", receptor_pdbqt,
                "--ligand", ligand_pdbqt,
                "--center_x", str(pocket.get("center_x", 0)),
                "--center_y", str(pocket.get("center_y", 0)),
                "--center_z", str(pocket.get("center_z", 0)),
                "--size_x", str(min(pocket.get("size_x", 20), 20)),
                "--size_y", str(min(pocket.get("size_y", 20), 20)),
                "--size_z", str(min(pocket.get("size_z", 20), 20)),
                "--exhaustiveness", "8",  # Stricter than before
                "--num_modes", "9",
                "--out", output_pdbqt,
            ]
            
            log.info(f"Running Vina ({struct_type}): {os.path.basename(receptor_pdbqt)} ← {smiles}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            
            if result.returncode != 0:
                raise RuntimeError(
                    f"Vina DOCKING FAILED ({struct_type})\n"
                    f"SMILES: {smiles}\n"
                    f"Receptor: {receptor_pdbqt}\n"
                    f"Error output:\n{result.stderr}"
                )
            
            # Parse Vina output for binding energy
            binding_energy = self._parse_vina_output(result.stdout, smiles, struct_type)
            
            if binding_energy is None:
                raise RuntimeError(
                    f"Cannot parse Vina output for {smiles} ({struct_type})\n"
                    f"Vina output:\n{result.stdout}"
                )
            
            log.info(f"✓ {struct_type} docking: {smiles} → {binding_energy:.1f} kcal/mol")
            return binding_energy

    async def _prepare_ligand_pdbqt(self, smiles: str) -> str:
        """
        Convert SMILES → 3D structure → PDBQT file.
        
        Returns:
            path to PDBQT file
        
        Raises:
            RuntimeError: If conversion fails
        """
        from rdkit import Chem
        from rdkit.Chem import AllChem
        
        log = get_logger(self.__class__.__name__)
        
        # Convert SMILES to molecule
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise RuntimeError(f"INVALID SMILES: {smiles}")
        
        mol = Chem.AddHs(mol)
        
        # Generate 3D coordinates
        try:
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.UFFOptimizeMolecule(mol)
        except Exception as e:
            raise RuntimeError(f"Failed to generate 3D geometry for {smiles}: {e}")
        
        # Validate coordinates (no NaN)
        conf = mol.GetConformer()
        for atom_idx in range(mol.GetNumAtoms()):
            pos = conf.GetAtomPosition(atom_idx)
            if pos.x != pos.x or pos.y != pos.y or pos.z != pos.z:  # NaN check
                raise RuntimeError(f"NaN coordinates in 3D structure for {smiles}")
        
        # Write SDF
        with tempfile.TemporaryDirectory() as tmpdir:
            sdf_path = os.path.join(tmpdir, "ligand.sdf")
            writer = Chem.SDWriter(sdf_path)
            writer.write(mol)
            writer.close()
            
            # Convert to PDBQT
            pdbqt_path = os.path.join(tmpdir, "ligand.pdbqt")
            cmd = ["obabel", sdf_path, "-O", pdbqt_path, "-xh"]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
            )
            
            if result.returncode != 0:
                raise RuntimeError(
                    f"Open Babel PDBQT conversion FAILED for {smiles}\n"
                    f"Error: {result.stderr}"
                )
            
            if not os.path.exists(pdbqt_path):
                raise RuntimeError(f"PDBQT file not created for {smiles}")
            
            # Copy to persistent location
            hash_name = str(abs(hash(smiles)))[:8]
            output_path = f"/tmp/ligand_{hash_name}.pdbqt"
            shutil.copy(pdbqt_path, output_path)
            
            return output_path

    def _parse_vina_output(self, stdout: str, smiles: str, struct_type: str) -> float | None:
        """
        Parse Vina output for binding affinity.
        
        Expected format:
          -----+------------+----------+----------
            1       -9.4      0.000      0.000
          ...
          -----+------------+----------+----------
        
        Returns:
            binding_affinity (float): Negative value in kcal/mol
            None: If parsing fails
        """
        log = get_logger(self.__class__.__name__)
        
        for line in stdout.splitlines():
            # Look for the mode result line (starts with number)
            tokens = line.split()
            if not tokens or not tokens[0].isdigit():
                continue
            
            # Format: mode_number affinity rmsd_lb rmsd_ub
            try:
                if len(tokens) >= 2:
                    affinity_str = tokens[1]
                    affinity = float(affinity_str)
                    
                    # Sanity checks
                    if -20 < affinity < 0:  # Valid Vina range
                        return affinity
                    else:
                        log.warning(f"Affinity {affinity} out of valid range for {smiles}")
            except (ValueError, IndexError):
                continue
        
        log.error(f"Cannot find binding affinity in Vina output for {smiles} ({struct_type})")
        return None
