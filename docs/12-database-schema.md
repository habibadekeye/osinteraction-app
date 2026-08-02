# HSE OPS AI — Database Schema Reference

## Implementation Note

The database uses Supabase (PostgreSQL). The primary user identity table is `profiles` (not `users`) because Supabase Auth manages the `auth.users` table separately. The `profiles` table has a 1:1 relationship with `auth.users` via the user's UUID.

## Core Tables (Currently Implemented)

### profiles (maps to spec's `users`)

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'field_worker'
        CHECK (role IN ('admin','hse_manager','hse_advisor','supervisor','field_worker','contractor','auditor')),
    department VARCHAR(50),
    location VARCHAR(50),
    asset_type VARCHAR(30),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200),
    context_summary TEXT,
    operational_context JSONB DEFAULT '{}',
    session_type VARCHAR(30) DEFAULT 'general'
        CHECK (session_type IN ('general','risk_assessment','ptw_guidance','incident_investigation','toolbox_talk','emergency')),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active','archived','flagged')),
    message_count INT DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text'
        CHECK (content_type IN ('text','voice_transcript','structured','error')),
    model_used VARCHAR(50),
    confidence_score DECIMAL(3,2),
    safety_flag BOOLEAN DEFAULT false,
    escalation_triggered BOOLEAN DEFAULT false,
    escalation_reason VARCHAR(100),
    governance_status VARCHAR(20) DEFAULT 'pending'
        CHECK (governance_status IN ('pending','approved','rejected','escalated')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Note: Citations are stored in a separate `citations` table (FK to chat_messages). In the current TypeScript types, `citations: Citation[]` is populated by a JOIN at query time.

### knowledge_categories
Pre-populated with 15 categories — see migration `20260612173143_safeops_baseline_schema.sql`.

### knowledge_documents
```sql
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    document_code VARCHAR(50) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES knowledge_categories(id),
    document_type VARCHAR(30)
        CHECK (document_type IN ('procedure','sop','manual','guideline','alert','lesson_learned','regulatory','emergency_plan')),
    description TEXT,
    version VARCHAR(10) DEFAULT '1.0',
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft','under_review','approved','archived','superseded')),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low','medium','high','critical')),
    is_contractor_visible BOOLEAN DEFAULT false,
    is_emergency_critical BOOLEAN DEFAULT false,
    metadata_tags VARCHAR[] DEFAULT '{}',
    asset_types VARCHAR[] DEFAULT '{}',
    departments VARCHAR[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### risk_assessments + risk_assessment_steps
See migration `20260612180512_create_ptw_and_incidents.sql`.

### toolbox_talks, observations, emergency_cards
See migration `20260612173143_safeops_baseline_schema.sql`.

### governance_reviews
```sql
CREATE TABLE governance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id),
    document_id UUID REFERENCES knowledge_documents(id),
    review_type VARCHAR(30)
        CHECK (review_type IN ('ai_response','document_content','citation_accuracy')),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','under_review','approved','rejected','escalated')),
    flagged_by UUID NOT NULL REFERENCES profiles(id),
    flagged_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(10) DEFAULT 'medium'
        CHECK (priority IN ('low','medium','high','critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Column naming note**: The status column is `status` (not `review_status`). Frontend queries must use `.eq('status', ...)` not `.eq('review_status', ...)`.

## Tables Pending Implementation

- `document_chunks` — requires pgvector extension
- `embeddings` — requires pgvector extension
- `citations` — references chat_messages + document_chunks
- `learning_modules` + `learning_quizzes` + `competency_records`
- `analytics_events` — event logging for usage analytics
- `audit_logs` — immutable audit trail

## TypeScript ↔ Database Mapping

```typescript
// src/types/index.ts
Profile       ↔  profiles
ChatSession   ↔  chat_sessions
ChatMessage   ↔  chat_messages (+ citations joined)
Citation      ↔  citations (virtual, joined)
KnowledgeDocument ↔ knowledge_documents
EmergencyCard ↔ emergency_cards
RiskAssessment ↔ risk_assessments
ToolboxTalk   ↔ toolbox_talks
Observation   ↔ observations
GovernanceReview ↔ governance_reviews
```

## Migrations

| File | Contents |
|------|---------|
| `20260612173143_safeops_baseline_schema.sql` | profiles, knowledge_categories, knowledge_documents, emergency_cards, toolbox_talks, observations, governance_reviews, learning_modules, competency_records |
| `20260612180512_create_ptw_and_incidents.sql` | risk_assessments, risk_assessment_steps, incident-related tables, PTW guidance tables |
