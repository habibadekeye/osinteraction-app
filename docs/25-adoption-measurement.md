# HSE OPS AI — Adoption Measurement

## Adoption Framework

HSE OPS AI adoption is tracked across three dimensions:
1. **Breadth**: How many users are using the platform
2. **Depth**: How frequently and meaningfully they use it
3. **Stickiness**: Whether users return and integrate it into daily work

## Adoption Milestones

| Milestone | Target | Success Criteria |
|-----------|--------|-----------------|
| Awareness | Week 2 | 100% of target users received onboarding |
| Activation | Week 4 | 80% of users have logged in at least once |
| Habit Formation | Week 8 | 50% of field supervisors use weekly |
| Dependency | Week 16 | Supervisors voluntarily replace paper JSAs with AI-generated JSAs |
| Advocacy | Week 24 | Users request new features; champions emerge |

## Role-Specific Adoption Targets (90-Day)

| Role | Target | Leading Indicator |
|------|--------|------------------|
| Field Worker | 60% DAU/WAU | Voice queries > 10% of queries |
| Supervisor | 80% WAU | ≥1 toolbox talk or JSA per week |
| HSE Advisor | 90% WAU | Documents reviewed; governance queue cleared |
| HSE Manager | 90% WAU | Analytics dashboard viewed weekly |
| Contractor | 40% MAU | Emergency card views; observations submitted |
| Auditor | 80% MAU | Governance export generated |

## Adoption Barriers (Identified from Personas)

| Barrier | Affected Persona | Mitigation |
|---------|-----------------|-----------|
| "I can't type with gloves" | Field Worker | Voice input (Phase 5) |
| "No signal on the rig" | All field | Offline mode (Phase 5) |
| "AI might be wrong" | HSE Manager | Citation display, governance dashboard |
| "My team won't use it" | Supervisor | Champion program, easy toolbox generation |
| "It's another system to log into" | All | SSO (Phase 6), mobile shortcut |
| "I already have procedures on paper" | Field Worker | Offline-cached digital procedures |

## Adoption Enablers

### Champion Program
- Identify 1 champion per department/asset
- Champions get early access to features
- Champions run internal training sessions
- Recognition: "HSE OPS AI Champion" badge in user profile

### Onboarding Flow
1. First login: show role-specific quick-start guide (3 steps max)
2. Supervisor first login → prompt: "Generate your first toolbox talk in 2 minutes"
3. Field worker first login → show emergency card for their asset type
4. HSE Manager first login → show governance dashboard KPIs

### Nudges (In-App)
- "You haven't submitted an observation this week" → prompt with quick-entry button
- "3 new documents added to your asset's knowledge base" → banner on dashboard
- "2 of your team's competency certificates expire in 30 days" → alert for supervisor

## Usage Measurement Queries

```sql
-- Daily active users (last 30 days)
SELECT 
  DATE(created_at) AS date,
  COUNT(DISTINCT user_id) AS dau
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Feature adoption by role
SELECT 
  p.role,
  ae.event_type,
  COUNT(DISTINCT ae.user_id) AS unique_users,
  COUNT(*) AS total_events
FROM analytics_events ae
JOIN profiles p ON p.id = ae.user_id
WHERE ae.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.role, ae.event_type
ORDER BY p.role, total_events DESC;

-- Retention cohort (7-day return rate)
WITH first_seen AS (
  SELECT user_id, MIN(DATE(created_at)) AS first_date
  FROM analytics_events
  GROUP BY user_id
),
returned AS (
  SELECT ae.user_id
  FROM analytics_events ae
  JOIN first_seen fs ON fs.user_id = ae.user_id
  WHERE DATE(ae.created_at) BETWEEN fs.first_date + 1 AND fs.first_date + 7
)
SELECT 
  COUNT(DISTINCT fs.user_id) AS new_users,
  COUNT(DISTINCT r.user_id) AS returned_7d,
  ROUND(COUNT(DISTINCT r.user_id) * 100.0 / NULLIF(COUNT(DISTINCT fs.user_id), 0), 1) AS retention_pct
FROM first_seen fs
LEFT JOIN returned r ON r.user_id = fs.user_id;
```

## Monthly Adoption Report

Generated automatically on the 1st of each month and emailed to HSE Manager:
- MAU / WAU / DAU trends
- Role-by-role adoption rates
- Top 10 most-queried topics (AI queries)
- Near-miss reporting rate vs. previous month
- Competency completion vs. previous month
- Feature highlights: which modules had highest growth
