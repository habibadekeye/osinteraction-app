# HSE OPS AI — Analytics KPIs

## Analytics Dashboard Sections

The analytics page (`/analytics`) provides four views:
1. **Usage Analytics** — platform adoption and engagement
2. **Risk Trend Analysis** — safety risk patterns over time
3. **Competency Gaps** — learning completion and qualification gaps
4. **Governance Health** — AI content quality and review metrics

## KPI Definitions

### Usage Analytics

| KPI | Definition | Target |
|----|-----------|--------|
| Daily Active Users | Unique users with ≥1 action per day | Growth week-over-week |
| Queries per User per Day | AI chat queries / DAU | 3–8 (indicates genuine daily use) |
| Feature Adoption Rate | % of users using each module | All core modules > 60% within 90 days |
| Session Duration | Avg minutes per login session | 8–15 min (meaningful engagement) |
| Mobile vs Desktop | % sessions by device type | Track trend toward mobile |
| Voice Query Rate | Voice queries / total queries | Target > 20% (field adoption signal) |

### AI Quality Metrics

| KPI | Definition | Target |
|----|-----------|--------|
| Citation Rate | % of responses with citations | > 95% |
| Escalation Rate | % of queries triggering STOP WORK | 0.5–2% (too low = not working, too high = over-triggering) |
| Average Confidence Score | Mean confidence across all responses | > 0.82 |
| Flag Rate | % of responses flagged by users | < 2% |
| Flag Resolution Rate | % of flagged responses reviewed within 48h | > 95% |
| Approval Rate | % of reviewed responses approved | Tracks accuracy |

### Operational Metrics

| KPI | Definition | Target |
|----|-----------|--------|
| Risk Assessments Generated | JSA/TRA count per week | Tracks operational use |
| Toolbox Talks Generated | Count per week | ≥ 1 per supervisor per week |
| Observations Submitted | Count per week | Positive trend = safety culture |
| High/Critical Observations | % of observations rated high/critical | Tracks risk exposure |
| Observation Close-out Rate | % closed within 14 days | > 80% |
| Near-Miss Reporting Rate | Near misses / total observations | Healthy safety culture: > 30% |

### Learning & Competency

| KPI | Definition | Target |
|----|-----------|--------|
| Module Completion Rate | Modules completed / modules started | > 70% |
| Average Quiz Score | Mean score across all completions | > 75% |
| Competency Gap Coverage | % of required modules completed per role | Supervisor/Field Worker > 80% |
| Certificate Expiry Rate | % of certificates expiring in next 30 days | Alert when > 10% |
| Learning Streak | Days with consecutive learning activity | Gamification signal |

## analytics_events Table

All user actions are logged to `analytics_events`. Query this table for all KPI calculations.

```typescript
type EventType = 
  | 'chat_query'            // AI chat message sent
  | 'document_view'          // Knowledge document opened
  | 'risk_assessment_created' // New JSA/TRA created
  | 'toolbox_generated'      // Toolbox talk generated
  | 'observation_submitted'  // Safety observation recorded
  | 'module_started'         // Learning module begun
  | 'module_completed'       // Learning module finished
  | 'emergency_card_viewed'  // Emergency card accessed
  | 'voice_query'            // Voice input used
  | 'search_query'           // Knowledge base search
  | 'export_generated';      // PDF/report exported
```

## Chart Specifications

### Usage Trend (Line Chart)
- X-axis: Date (daily for past 30 days, weekly for past 6 months)
- Y-axis: Query count
- Series: Total queries, unique users
- Recharts: `<LineChart>` with `<Line>` for each series

### Risk Heatmap (Recharts Scatter or custom grid)
- X: Likelihood 1–5
- Y: Severity 1–5
- Cell color: risk rating color
- Dot size: observation count at that risk level

### Competency Progress (Bar Chart)
- X: Department or role
- Y: Completion percentage
- Color: Green (≥80%), Yellow (60–79%), Red (<60%)

### Observation Type Distribution (Pie Chart)
- Segments: unsafe_act, unsafe_condition, near_miss, positive, environmental
- Near-miss % highlighted — key leading indicator

## Department Filtering

All analytics views support filtering by:
- Department (Drilling, Operations, Maintenance, HSE, Construction)
- Asset type (rig, platform, fpso, terminal, construction)
- Date range (7d, 30d, 90d, 12m, custom)
- Role group (management, supervisors, field workers, contractors)

## Export Reports

Available for Admin / HSE Manager / Auditor:

| Report | Format | Audience |
|--------|--------|---------|
| Usage Summary | PDF / Excel | Management review |
| AI Governance Report | PDF | Audit / regulatory |
| Competency Gap Report | PDF / Excel | HR / Training |
| Observation Trend Report | PDF | HSE review meetings |
| Incident Correlation Report | PDF | Monthly HSE meeting |
