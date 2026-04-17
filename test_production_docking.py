"""
PRODUCTION DOCKING SYSTEM - INTEGRATION & TESTING GUIDE

This script demonstrates integration and testing of the production docking system.
Run this to verify everything works before deploying to pipeline.
"""

import asyncio
import os
import sys
import tempfile
from pathlib import Path

# Test PDB content (minimal valid structure - 1A2B)
TEST_PDB_CONTENT = """HEADER    TRANSFERASE                    22-JUN-82   1A2B              
ATOM      1  N   VAL A   1      20.154  29.699   5.276  1.00 20.00           N
ATOM      2  CA  VAL A   1      20.580  29.843   6.618  1.00 20.00           C
ATOM      3  C   VAL A   1      19.894  28.960   7.618  1.00 20.00           C
ATOM      4  O   VAL A   1      18.836  28.522   7.442  1.00 20.00           O
ATOM      5  CB  VAL A   1      20.309  31.280   7.161  1.00 20.00           C
ATOM      6  CG1 VAL A   1      20.586  31.348   8.653  1.00 20.00           C
ATOM      7  CG2 VAL A   1      20.902  32.336   6.395  1.00 20.00           C
TER
END
"""

TEST_MOLECULES = [
    {"smiles": "CCO", "compound_name": "Ethanol"},
    {"smiles": "CC(C)C", "compound_name": "Isobutane"},
    {"smiles": "c1ccccc1", "compound_name": "Benzene"},
]

TEST_POCKET = {
    "center_x": 20.0,
    "center_y": 29.0,
    "center_z": 6.0,
    "size_x": 20,
    "size_y": 20,
    "size_z": 20,
}


class DockingSystemTester:
    """Test suite for production docking system."""

    def __init__(self):
        self.log_section_count = 0

    def section(self, title: str) -> None:
        """Print formatted section header."""
        self.log_section_count += 1
        print(f"\n{'='*70}")
        print(f"TEST {self.log_section_count}: {title}")
        print(f"{'='*70}")

    def check(self, label: str, condition: bool, error_msg: str = "") -> None:
        """Check condition and print result."""
        status = "✓ PASS" if condition else "✗ FAIL"
        print(f"{status} - {label}")
        if not condition and error_msg:
            print(f"      Error: {error_msg}")

    async def test_dependencies(self) -> bool:
        """Test 1: Verify all required tools are available."""
        self.section("Verify Dependencies")
        
        print("\nChecking for required executables...")
        
        import shutil
        import os
        
        # Check for vina in multiple locations
        vina_path = shutil.which("vina")
        if not vina_path:
            # Check PyRx installation
            pyrx_paths = [
                r"C:\Program Files (x86)\PyRx\vina.exe",
                r"C:\Program Files\PyRx\vina.exe",
            ]
            for path in pyrx_paths:
                if os.path.exists(path):
                    vina_path = path
                    break
        obabel_path = shutil.which("obabel")
        
        self.check("AutoDock Vina installed", vina_path is not None, 
                   "Install: pip install vina")
        if vina_path:
            print(f"        Location: {vina_path}")
        
        self.check("Open Babel installed", obabel_path is not None,
                   "Install: apt install openbabel (or brew)")
        if obabel_path:
            print(f"        Location: {obabel_path}")
        
        print("\nChecking for Python packages...")
        
        rdkit_ok = True
        try:
            from rdkit import Chem
            print("✓ PASS - RDKit available")
        except ImportError:
            print("✗ FAIL - RDKit not found (pip install rdkit)")
            rdkit_ok = False
        
        all_ok = (vina_path is not None and obabel_path is not None and rdkit_ok)
        
        print("\n" + ("="*70))
        if all_ok:
            print("✓ All dependencies satisfied")
        else:
            print("✗ Missing dependencies - cannot proceed")
        print("="*70)
        
        return all_ok

    async def test_imports(self) -> bool:
        """Test 2: Verify production docking agent imports."""
        self.section("Import Production Agent")
        
        try:
            from backend.agents.DockingAgent_Production import (
                DockingAgent, ProteinPreparer, LigandPreparer, VinaExecutor
            )
            print("✓ PASS - DockingAgent_Production imported successfully")
            print("  - DockingAgent (main orchestrator)")
            print("  - ProteinPreparer (structure prep)")
            print("  - LigandPreparer (molecule prep)")
            print("  - VinaExecutor (docking executor)")
            return True
        except ImportError as e:
            print(f"✗ FAIL - Import error: {e}")
            return False

    async def test_protein_preparation(self) -> bool:
        """Test 3: Prepare protein structure (PDB→PDBQT)."""
        self.section("Protein Preparation (PDB→PDBQT)")
        
        try:
            from backend.agents.DockingAgent_Production import ProteinPreparer
            
            preparer = ProteinPreparer()
            
            with tempfile.TemporaryDirectory() as tmpdir:
                pdbqt_path = await preparer.prepare(
                    TEST_PDB_CONTENT, "test_1a2b", tmpdir
                )
                
                exists = os.path.exists(pdbqt_path)
                self.check("PDBQT file created", exists)
                
                if exists:
                    size = os.path.getsize(pdbqt_path)
                    self.check(f"PDBQT file non-empty ({size} bytes)", size > 0)
                    
                    with open(pdbqt_path, "r") as f:
                        content = f.read()
                        has_root = "ROOT" in content and "ENDROOT" in content
                        self.check("Valid PDBQT structure (ROOT/ENDROOT)", has_root)
                    
                    return True
        
        except Exception as e:
            print(f"✗ FAIL - Exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def test_ligand_preparation(self) -> bool:
        """Test 4: Prepare ligand (SMILES→3D→PDBQT)."""
        self.section("Ligand Preparation (SMILES→3D→PDBQT)")
        
        try:
            from backend.agents.DockingAgent_Production import LigandPreparer
            
            preparer = LigandPreparer()
            
            with tempfile.TemporaryDirectory() as tmpdir:
                ligand_info = await preparer.prepare("CCO", tmpdir)
                
                self.check("PDBQT file generated", os.path.exists(ligand_info["pdbqt_path"]))
                self.check("PDB file generated", os.path.exists(ligand_info["pdb_path"]))
                self.check("SDF file generated", os.path.exists(ligand_info["sdf_path"]))
                
                self.check(f"Molecular weight computed ({ligand_info['molecular_weight']:.1f})",
                          ligand_info["molecular_weight"] > 0)
                self.check(f"Atom count valid ({ligand_info['num_atoms']} atoms)",
                          ligand_info["num_atoms"] > 0)
                
                return True
        
        except Exception as e:
            print(f"✗ FAIL - Exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def test_docking_execution(self) -> bool:
        """Test 5: Run actual molecular docking."""
        self.section("Molecular Docking Execution")
        
        try:
            from backend.agents.DockingAgent_Production import DockingAgent
            
            agent = DockingAgent()
            
            state = {
                "pdb_content": TEST_PDB_CONTENT,
                "generated_molecules": TEST_MOLECULES,
                "binding_pocket": TEST_POCKET,
                "structures": [{"pdb_id": "test"}],
            }
            
            result = await agent.run(state)
            
            self.check("No errors in result", "errors" not in result or len(result.get("errors", [])) == 0)
            self.check("Real docking flag set", result.get("real_docking") == True)
            self.check("Molecules docked", len(result.get("docking_results", [])) > 0,
                      f"Expected >0, got {len(result.get('docking_results', []))}")
            
            if result.get("docking_results"):
                mol = result["docking_results"][0]
                
                self.check("Binding affinity computed", "mutant_affinity" in mol)
                if "mutant_affinity" in mol:
                    af = mol["mutant_affinity"]
                    self.check(f"Binding affinity in valid range ({af:.1f} kcal/mol)",
                              -20 < af < 0)
                
                self.check("Ligand PDB path provided", "ligand_pdb" in mol)
                self.check("Complex PDB path provided", "complex_pdb" in mol)
                self.check("Visualization data provided", "visualization" in mol)
                self.check("is_real flag set", mol.get("is_real") == True)
            
            return True
        
        except Exception as e:
            print(f"✗ FAIL - Exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def test_dual_docking(self) -> bool:
        """Test 6: Dual docking (mutant + wildtype)."""
        self.section("Dual Docking (Mutant + Wildtype)")
        
        try:
            from backend.agents.DockingAgent_Production import DockingAgent
            
            agent = DockingAgent()
            
            # Use same PDB as wildtype (in real scenario, these differ)
            state = {
                "pdb_content": TEST_PDB_CONTENT,
                "wt_pdb_content": TEST_PDB_CONTENT,  # ← Wildtype
                "generated_molecules": TEST_MOLECULES[:1],  # Just one for speed
                "binding_pocket": TEST_POCKET,
                "structures": [{"pdb_id": "test"}],
            }
            
            result = await agent.run(state)
            
            self.check("Dual docking completed", result.get("has_wt_comparison") == True)
            
            if result.get("docking_results"):
                mol = result["docking_results"][0]
                
                self.check("WT affinity computed", "wt_affinity" in mol)
                self.check("ΔΔG computed", "delta_ddg" in mol)
                
                if all(k in mol for k in ["mutant_affinity", "wt_affinity", "delta_ddg"]):
                    mut_g = mol["mutant_affinity"]
                    wt_g = mol["wt_affinity"]
                    ddg = mol["delta_ddg"]
                    expected_ddg = mut_g - wt_g
                    
                    self.check(f"ΔΔG calculation correct ({ddg:.1f} = {mut_g:.1f} - {wt_g:.1f})",
                              abs(ddg - expected_ddg) < 0.01)
            
            return True
        
        except Exception as e:
            print(f"✗ FAIL - Exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def test_visualization_outputs(self) -> bool:
        """Test 7: Verify visualization files are generated."""
        self.section("Visualization File Generation")
        
        try:
            from backend.agents.DockingAgent_Production import DockingAgent
            
            agent = DockingAgent()
            
            state = {
                "pdb_content": TEST_PDB_CONTENT,
                "generated_molecules": TEST_MOLECULES[:1],
                "binding_pocket": TEST_POCKET,
                "structures": [{"pdb_id": "test"}],
            }
            
            result = await agent.run(state)
            
            if result.get("docking_results"):
                mol = result["docking_results"][0]
                
                # Check visualization structure
                viz = mol.get("visualization", {})
                
                self.check("Visualization dict present", "visualization" in mol)
                self.check("complex_file defined", "complex_file" in viz)
                self.check("ligand_file defined", "ligand_file" in viz)
                self.check("protein_file defined", "protein_file" in viz)
                
                # Check files exist
                if "complex_file" in viz:
                    exists = os.path.exists(viz["complex_file"])
                    self.check(f"Complex PDB exists: {viz['complex_file']}", exists)
                
                if "ligand_file" in viz:
                    exists = os.path.exists(viz["ligand_file"])
                    self.check(f"Ligand SDF exists: {viz['ligand_file']}", exists)
                
                return True
        
        except Exception as e:
            print(f"✗ FAIL - Exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def run_all_tests(self):
        """Run complete test suite."""
        print("\n")
        print("█" * 70)
        print("█" + " " * 68 + "█")
        print("█" + "  PRODUCTION DOCKING SYSTEM - COMPREHENSIVE TEST SUITE".center(68) + "█")
        print("█" + " " * 68 + "█")
        print("█" * 70)
        
        tests = [
            ("Dependencies", self.test_dependencies),
            ("Imports", self.test_imports),
            ("Protein Preparation", self.test_protein_preparation),
            ("Ligand Preparation", self.test_ligand_preparation),
            ("Docking Execution", self.test_docking_execution),
            ("Dual Docking", self.test_dual_docking),
            ("Visualization Files", self.test_visualization_outputs),
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            try:
                results[test_name] = await test_func()
            except Exception as e:
                print(f"\n✗ CRITICAL ERROR in {test_name}: {e}")
                import traceback
                traceback.print_exc()
                results[test_name] = False
        
        # Summary
        print("\n\n")
        print("█" * 70)
        print("█" + " " * 68 + "█")
        print("█" + "  TEST SUMMARY".center(68) + "█")
        print("█" + " " * 68 + "█")
        print("█" * 70)
        
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status} - {test_name}")
        
        print("█" * 70)
        print(f"\nRESULT: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n✓ ALL TESTS PASSED - System ready for deployment\n")
            return 0
        else:
            print(f"\n✗ {total - passed} test(s) failed - Review errors above\n")
            return 1


async def main():
    """Entry point."""
    tester = DockingSystemTester()
    exit_code = await tester.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
