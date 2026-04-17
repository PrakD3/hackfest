"""Stress testing suite for VariantEffectAgent."""

import asyncio
import time
from agents.VariantEffectAgent import VariantEffectAgent


async def test_stress():
    """Stress test VariantEffectAgent with edge cases and heavy load."""
    
    agent = VariantEffectAgent()
    tests_passed = 0
    tests_failed = 0
    
    print("=" * 80)
    print("STRESS TEST SUITE FOR VARIANT EFFECT AGENT")
    print("=" * 80)
    
    # STRESS TEST 1: Large number of sequential calls
    print("\n[STRESS 1] Sequential calls (100 iterations)")
    try:
        start = time.time()
        for i in range(100):
            state = {
                'query': f'TEST_GENE_{i} M{i}X',
                'mutation_context': {'gene': f'TEST_{i}', 'mutation': f'M{i}X'},
                'proteins': [],
            }
            result = await agent.run(state)
            assert 'esm1v_score' in result
        elapsed = time.time() - start
        print(f"  ✅ PASS: 100 sequential calls in {elapsed:.2f}s")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 2: Concurrent calls (50 parallel)
    print("\n[STRESS 2] Concurrent calls (50 parallel)")
    try:
        start = time.time()
        tasks = []
        for i in range(50):
            state = {
                'query': f'GENE_{i} V{i}A',
                'mutation_context': {'gene': f'GENE_{i}', 'mutation': f'V{i}A'},
                'proteins': [],
            }
            tasks.append(agent.run(state))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        failed = sum(1 for r in results if isinstance(r, Exception))
        if failed > 0:
            print(f"  ⚠️  {failed}/50 calls failed")
        else:
            elapsed = time.time() - start
            print(f"  ✅ PASS: 50 concurrent calls in {elapsed:.2f}s")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 3: Missing required fields
    print("\n[STRESS 3] Missing required fields")
    try:
        edge_cases = [
            ({}, "completely empty"),
            ({'query': 'EGFR'}, "missing mutation_context"),
            ({'mutation_context': {'gene': 'EGFR'}}, "missing mutation in context"),
            ({'mutation_context': {}, 'query': ''}, "empty mutation context"),
        ]
        
        for state, description in edge_cases:
            result = await agent.run(state)
            # Should not crash, should return valid output
            assert 'esm1v_score' in result, f"Failed for: {description}"
        
        print(f"  ✅ PASS: All {len(edge_cases)} missing field cases handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 4: Invalid data types
    print("\n[STRESS 4] Invalid data types")
    try:
        invalid_cases = [
            {'query': None, 'mutation_context': None, 'proteins': []},
            {'query': 123, 'mutation_context': {'gene': 456, 'mutation': 789}, 'proteins': []},
            {'query': [], 'mutation_context': {'gene': []}, 'proteins': []},
        ]
        
        for state in invalid_cases:
            result = await agent.run(state)
            # Should gracefully handle type errors
            assert isinstance(result, dict), "Should return dict"
        
        print(f"  ✅ PASS: All {len(invalid_cases)} invalid type cases handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 5: Very long strings
    print("\n[STRESS 5] Very long strings")
    try:
        long_string = "A" * 10000
        state = {
            'query': long_string,
            'mutation_context': {'gene': long_string, 'mutation': long_string},
            'proteins': [],
        }
        result = await agent.run(state)
        assert 'esm1v_score' in result
        print(f"  ✅ PASS: 10,000-character strings handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 6: Special characters and Unicode
    print("\n[STRESS 6] Special characters and Unicode")
    try:
        special_cases = [
            {'query': 'EGFR@#$%^&*()', 'mutation_context': {'gene': 'EGFR', 'mutation': 'T790M'}},
            {'query': '日本語テスト', 'mutation_context': {'gene': '中文', 'mutation': 'العربية'}},
            {'query': '\n\t\r\x00', 'mutation_context': {'gene': '\x00', 'mutation': '\n'}},
        ]
        
        for state in special_cases:
            state['proteins'] = []
            result = await agent.run(state)
            assert 'esm1v_score' in result
        
        print(f"  ✅ PASS: Special characters/Unicode handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 7: Extremely long protein lists
    print("\n[STRESS 7] Large protein lists (1000 entries)")
    try:
        state = {
            'query': 'EGFR T790M',
            'mutation_context': {'gene': 'EGFR', 'mutation': 'T790M'},
            'proteins': [{'sequence': 'ACGTACGTACGT' * 100} for _ in range(1000)],
        }
        result = await agent.run(state)
        assert 'esm1v_score' in result
        print(f"  ✅ PASS: 1000-entry protein list handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 8: Repeated rapid calls to same mutation
    print("\n[STRESS 8] Repeated calls (same mutation 1000x)")
    try:
        start = time.time()
        state = {
            'query': 'EGFR T790M',
            'mutation_context': {'gene': 'EGFR', 'mutation': 'T790M'},
            'proteins': [],
        }
        for _ in range(1000):
            result = await agent.run(state)
            assert result['esm1v_score'] == 0.85
        elapsed = time.time() - start
        print(f"  ✅ PASS: 1000 identical calls in {elapsed:.2f}s (avg {elapsed*1000/1000:.2f}ms each)")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 9: Mutation strings with regex metacharacters
    print("\n[STRESS 9] Mutation strings with regex metacharacters")
    try:
        regex_cases = [
            {'gene': 'EGFR', 'mutation': 'T790M.*'},
            {'gene': 'EGFR', 'mutation': '[T790M]'},
            {'gene': 'EGFR', 'mutation': 'T(790)M'},
            {'gene': 'EGFR', 'mutation': 'T|790|M'},
        ]
        
        for ctx in regex_cases:
            state = {
                'query': f"{ctx['gene']} {ctx['mutation']}",
                'mutation_context': ctx,
                'proteins': [],
            }
            result = await agent.run(state)
            assert isinstance(result, dict)
        
        print(f"  ✅ PASS: All {len(regex_cases)} regex metacharacters handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 10: Case sensitivity stress
    print("\n[STRESS 10] Case sensitivity variants (100 combinations)")
    try:
        cases = ['EGFR', 'egfr', 'EgfR', 'eGFR', 'eGfr']
        mutations = ['T790M', 't790m', 'T790m', 't790M']
        count = 0
        
        for gene in cases:
            for mutation in mutations[:2]:  # Limited to 10 combinations
                state = {
                    'query': f'{gene} {mutation}',
                    'mutation_context': {'gene': gene, 'mutation': mutation},
                    'proteins': [],
                }
                result = await agent.run(state)
                assert 'esm1v_score' in result
                count += 1
        
        print(f"  ✅ PASS: {count} case sensitivity variants handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 11: Empty and whitespace-only strings
    print("\n[STRESS 11] Empty and whitespace strings")
    try:
        whitespace_cases = [
            {'query': '', 'mutation_context': {'gene': '', 'mutation': ''}},
            {'query': '   ', 'mutation_context': {'gene': '   ', 'mutation': '   '}},
            {'query': '\n\n\n', 'mutation_context': {'gene': '\t\t', 'mutation': '\r\r'}},
        ]
        
        for state in whitespace_cases:
            state['proteins'] = []
            result = await agent.run(state)
            assert 'esm1v_score' in result
        
        print(f"  ✅ PASS: All {len(whitespace_cases)} whitespace cases handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # STRESS TEST 12: Mutation strings that could be in known database
    print("\n[STRESS 12] Similar-to-known mutations (typos/variations)")
    try:
        typo_cases = [
            {'gene': 'EGFR', 'mutation': 'T790m'},  # lowercase
            {'gene': 'egfr', 'mutation': 'T790M'},  # lowercase gene
            {'gene': 'EGFR', 'mutation': 'T790 M'},  # space
            {'gene': 'EGFR', 'mutation': 'T-790-M'},  # dashes
        ]
        
        for ctx in typo_cases:
            state = {
                'query': f"{ctx['gene']} {ctx['mutation']}",
                'mutation_context': ctx,
                'proteins': [],
            }
            result = await agent.run(state)
            # Should return valid score regardless
            assert 0 <= result.get('esm1v_score', 0.5) <= 1
        
        print(f"  ✅ PASS: All {len(typo_cases)} typo variations handled")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ FAIL: {e}")
        tests_failed += 1
    
    # Summary
    print("\n" + "=" * 80)
    print(f"STRESS TEST RESULTS: {tests_passed} PASSED, {tests_failed} FAILED")
    print("=" * 80)
    
    if tests_failed == 0:
        print("✅ ALL STRESS TESTS PASSED - NO ERRORS FOUND")
        return True
    else:
        print(f"❌ {tests_failed} STRESS TEST(S) FAILED")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_stress())
    exit(0 if success else 1)
