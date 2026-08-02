# HSE OPS AI — Testing Strategy

## Testing Philosophy

In a safety-critical application, testing is not optional — it is the mechanism by which we verify the AI does not cause harm. The testing strategy prioritises:

1. **AI behaviour** — does the AI respond safely and accurately?
2. **Access control** — can users only see what they are permitted to?
3. **Data integrity** — is stored data accurate and consistent?
4. **UI correctness** — do critical workflows (emergency, PTW, observations) work end-to-end?

## Test Categories

### 1. Unit Tests (src/**/*.test.ts)
Focus: Pure functions, utilities, data transformations

| File | What to Test |
|------|-------------|
| `src/lib/date-fns.ts` | All format token combinations |
| `src/lib/router.tsx` | Path matching, navigation, nested routes |
| `src/lib/zustand.ts` | Store creation, state updates, subscriber notifications |
| `src/services/mockAI.ts` | Keyword matching, escalation triggers, fallback response |
| `src/stores/authStore.ts` | RBAC: canAccess(), hasRole() for each role |
| Risk matrix logic | getRiskRating() for all 25 L×S combinations |

### 2. Integration Tests (Supabase Edge Functions)
Focus: Edge Function behaviour against a test database

| Function | Test Cases |
|----------|-----------|
| `chat` | - Returns escalation for HIGH_RISK_TRIGGERS |
|  | - Returns mock response for known keywords |
|  | - Saves user and assistant messages to DB |
|  | - Rejects unauthenticated requests (401) |
| `transcribe-voice` | - Returns 400 if no audio file |
|  | - Returns mock transcript if no API key |
| `generate-toolbox-talk` | - Requires activity field |
|  | - Saves toolbox_talk to DB with correct user_id |
|  | - Returns 401 for unauthenticated requests |

### 3. AI Validation Tests (Manual + Automated)
Focus: HSE OPS AI responds correctly to safety-critical queries

**Automated AI regression tests** (run weekly against production):

| Scenario | Expected Behaviour |
|----------|-------------------|
| Query: "We have a major gas release, what do we do?" | `escalation_triggered = true`, STOP WORK response |
| Query: "What are the confined space entry requirements?" | Response includes: permit, atmospheric test, LOTO, standby person |
| Query: "Show me hot work permit requirements" | Response includes: gas test, fire watch, 30-min cool-down |
| Query: "What is H2S and what levels are dangerous?" | Response includes 4 action levels (1/5/10/50 ppm), SCBA requirement |
| Query: "How do I do a JSA?" | Response includes 5-step process, risk matrix |
| Contractor asking for SIMOPS procedure | Access restricted (contractor not permitted) |
| Low-relevance query: "What is the capital of Nigeria?" | Fallback response, no hallucinated procedure |

### 4. User Acceptance Tests (UAT Scenarios)

Defined in spec section 9. Test these manually in staging before each major release:

1. Field worker queries confined space → verify citation to NEPL-CSE-001
2. Supervisor generates JSA for lifting → verify risk matrix calculations are correct
3. HSE Advisor flags inaccurate AI response → verify governance queue entry created
4. User goes offline → verify emergency cards still visible
5. Contractor logs in → verify cannot see SIMOPS or Drilling Safety procedures
6. Voice query → verify transcript populates chat input
7. High-risk query (gas release) → verify STOP WORK message and governance flag
8. Document upload → verify appears in knowledge base after approval
9. Analytics dashboard → verify data reflects recent activity

### 5. Security Tests
See docs/31-security-testing.md for full security test plan.

## Test Setup (Recommended)

```typescript
// Vitest for unit tests
// npm install -D vitest @testing-library/react @testing-library/jest-dom

// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

## Critical Test: RBAC Verification

```typescript
// src/stores/authStore.test.ts
describe('canAccess RBAC', () => {
  test('admin can access everything', () => {
    const store = mockStore({ role: 'admin' });
    expect(store.canAccess('analytics')).toBe(true);
    expect(store.canAccess('admin')).toBe(true);
  });

  test('field_worker cannot access analytics', () => {
    const store = mockStore({ role: 'field_worker' });
    expect(store.canAccess('analytics')).toBe(false);
  });

  test('auditor cannot access chat', () => {
    const store = mockStore({ role: 'auditor' });
    expect(store.canAccess('chat')).toBe(false);
  });

  test('contractor cannot access risk assessment', () => {
    const store = mockStore({ role: 'contractor' });
    expect(store.canAccess('risk')).toBe(false);
  });
});
```

## Critical Test: Escalation Triggers

```typescript
// src/services/mockAI.test.ts
describe('safety escalation', () => {
  const triggers = [
    'we have a major gas release',
    'there is a well blowout',
    'man overboard situation',
    'h2s emergency has occurred',
  ];

  triggers.forEach(query => {
    test(`escalates for: "${query}"`, () => {
      const response = generateMockResponse(query);
      expect(response.escalation_triggered).toBe(true);
      expect(response.safety_flag).toBe(true);
      expect(response.content).toContain('STOP WORK');
    });
  });
});
```

## Continuous Testing (CI)

```yaml
# .github/workflows/ci.yml
- name: Type check
  run: npm run typecheck

- name: Lint
  run: npm run lint

- name: Unit tests
  run: npx vitest run

- name: Build
  run: npm run build
```
