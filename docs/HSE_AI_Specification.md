# HSE Interaction AI Web App
## AI-Agent Ready Technical Specification v2.0

---

## 1. PROJECT IDENTITY & DECISION FRAMEWORK

### 1.1 App Name Decision
**Selected: HSE OPS AI** (maintains brand consistency with HSE OPS AI HSE and HSE OPS AI Fire Inventory)

### 1.2 Build vs. Configure Decisions
| Decision | Choice | Rationale | Constraint |
|----------|--------|-----------|------------|
| LLM Provider | Azure OpenAI GPT-4o | Enterprise SLA, data residency, Nigerian regulatory compliance | Fallback: Anthropic Claude 3.5 Sonnet |
| Vector DB | pgvector (PostgreSQL extension) | Single database stack, no additional infrastructure | Pinecone if scale > 1M docs |
| Auth | Custom JWT + NEPL SSO (Phase 6) | RBAC needs 7 custom roles, SSO integration later | SAML 2.0 ready |
| Speech | Web Speech API (client) + Whisper API (server) | Browser-native STT, OpenAI Whisper for noisy environments | No custom speech models |
| Offline | Service Worker + IndexedDB | PWA standard, caches critical docs | 50MB storage limit |
| Charts | Recharts | Standard operational charts | No custom D3 needed |
| PDF Export | jspdf + jspdf-autotable | Client-side generation | Server-side for > 100 pages |
| Hosting | Azure App Service (Node) + Azure PostgreSQL | NEPL enterprise cloud, data residency Nigeria/Africa | AWS backup option |
| AI Orchestration | LangChain / LangGraph | Complex RAG pipelines, agent workflows | Custom if LangChain too heavy |
| Embeddings | Azure OpenAI text-embedding-3-large | 3072 dims, best retrieval quality | text-embedding-3-small fallback |

### 1.3 Explicit Scope Boundaries (MUST NOT BUILD)
- **NO real-time IoT sensor integration** — manual input only
- **NO predictive incident AI** — descriptive/retrieval only in MVP
- **NO automated permit issuance** — guidance only, human approval required
- **NO integration with SCADA/DCS systems** — standalone platform
- **NO multi-language beyond English** — Phase 6 consideration
- **NO video analysis/AI vision** — text and document processing only
- **NO blockchain audit trail** — PostgreSQL audit logs sufficient
- **NO automated emergency dispatch** — guidance cards only, human escalation

---

## 2. USER PERSONAS & ACCESS CONTROL

### 2.1 Persona Definitions
```typescript
interface UserPersona {
  role: 'admin' | 'hse_manager' | 'hse_advisor' | 'supervisor' | 'field_worker' | 'contractor' | 'auditor';
  workContext: string;
  primaryGoal: string;
  techComfort: 'low' | 'medium' | 'high';
  dailyActions: string[];
  painPoints: string[];
  devicePreference: string;
  offlineNeeds: string[];
}
```

**Admin (IT/HSE Systems Administrator)**
- Work context: Office, desktop-primary
- Goal: System governance, user management, content oversight, platform health
- Tech comfort: High
- Daily actions: Manage users, review governance queues, configure AI settings, monitor analytics, handle escalations
- Pain points: "I need to know what the AI is telling people", "Content gets outdated quickly"
- Device preference: Desktop
- Offline needs: None

**HSE Manager**
- Work context: Office + site visits, 50/50 desktop/tablet
- Goal: Governance oversight, analytics review, compliance reporting, content approval
- Tech comfort: Medium-High
- Daily actions: Review AI governance dashboard, approve flagged responses, analyze risk trends, export compliance reports, configure safety thresholds
- Pain points: "I need to see what risks my teams are asking about", "AI responses must be traceable to real procedures"
- Device preference: Desktop (analytics), Tablet (site)
- Offline needs: Emergency procedures, critical SOPs

**HSE Advisor (SME Content Curator)**
- Work context: Office, desktop-primary
- Goal: Content accuracy, procedure updates, AI response validation, knowledge base curation
- Tech comfort: Medium
- Daily actions: Review AI-generated responses for accuracy, update procedures, validate citations, upload new documents, mark content for review
- Pain points: "The AI cited an outdated procedure", "I need to see exactly what documents the AI used"
- Device preference: Desktop
- Offline needs: None

**Supervisor (Operations/Drilling/Construction)**
- Work context: Field, 70% tablet/phone, 30% desktop
- Goal: Operational guidance, risk assessment support, toolbox talks, permit guidance
- Tech comfort: Medium
- Daily actions: Ask AI about work procedures, generate JSAs, check PTW requirements, conduct toolbox talks, review safety observations, escalate high-risk queries
- Pain points: "I need answers fast in the field", "Paper procedures are outdated the moment they're printed", "I need this to work without signal offshore"
- Device preference: Tablet (rugged case), Phone
- Offline needs: Emergency response cards, critical SOPs, toolbox templates, JSA templates

**Field Worker (Technician/Operator/Roustabout)**
- Work context: Field, hands-on, often dirty/wet/noisy
- Goal: Quick safety guidance, procedure lookup, hazard awareness, competency support
- Tech comfort: Low-Medium
- Daily actions: Voice-query the AI, read toolbox talks, check permit requirements, report observations, take micro-learning quizzes
- Pain points: "I can't type with gloves on", "The signal is terrible on the rig", "I need simple answers, not essays", "I don't know the exact procedure name"
- Device preference: Phone (voice-primary), Tablet
- Offline needs: Emergency procedures, toolbox talks, safety observation form, competency quizzes

**Contractor (External Workers)**
- Work context: Field, temporary access
- Goal: Scoped safety guidance, contractor-specific procedures, basic hazard awareness
- Tech comfort: Low-Medium
- Daily actions: Access scoped knowledge base, view contractor safety briefings, submit observations, limited chat queries
- Pain points: "I don't have access to NEPL's full system", "I need contractor-specific guidance only"
- Device preference: Phone
- Offline needs: Contractor safety briefing, emergency muster points

**Auditor (Internal/External Audit)**
- Work context: Office, desktop-primary
- Goal: Compliance verification, governance review, traceability analysis
- Tech comfort: High
- Daily actions: Review audit logs, analyze AI response accuracy, check content approval workflows, export governance reports
- Pain points: "I need complete traceability of AI recommendations", "Show me every time the AI was overridden"
- Device preference: Desktop
- Offline needs: None

### 2.2 Role-Based Access Control (RBAC) Matrix
```
Feature / Module              Admin  HSE Mgr  HSE Adv  Supervisor  Field Wrkr  Contractor  Auditor
AI CHAT ASSISTANT              Yes     Yes      Yes       Yes         Yes         Yes*       No
  Text chat                    Yes     Yes      Yes       Yes         Yes         Yes        No
  Voice chat                   Yes     Yes      Yes       Yes         Yes         Yes        No
  Multi-turn conversations     Yes     Yes      Yes       Yes         Yes         Yes        No
  High-risk topic escalation   Yes     Yes      Yes       Yes         Yes         Yes        No
  Citation viewing             Yes     Yes      Yes       Yes         Yes         Yes        No

KNOWLEDGE BASE                 Yes     Yes      Yes       Yes         Yes         Yes*       Yes
  Semantic search              Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Document viewing             Yes     Yes      Yes       Yes         Yes         Yes*       Yes
  Category filtering           Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Document upload              Yes     Yes      Yes       No          No          No         No
  Document edit                Yes     Yes      Yes       No          No          No         No
  Version control              Yes     Yes      Yes       Yes         Yes         Yes        Yes

RISK ASSESSMENT                Yes     Yes      Yes       Yes         No          No         Yes
  JSA generation               Yes     Yes      Yes       Yes         No          No         Yes
  TRA generation               Yes     Yes      Yes       Yes         No          No         Yes
  Risk matrix calculation      Yes     Yes      Yes       Yes         No          No         Yes
  Bow-tie analysis             Yes     Yes      Yes       Yes         No          No         Yes
  Export PDF                   Yes     Yes      Yes       Yes         No          No         Yes

PTW GUIDANCE                   Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Permit requirement check     Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Isolation guidance           Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Gas testing requirements     Yes     Yes      Yes       Yes         Yes         Yes        Yes
  SIMOPS conflict check        Yes     Yes      Yes       Yes         Yes         No         Yes

TOOLBOX TALK                   Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Generate toolbox talk        Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Customize for crew           Yes     Yes      Yes       Yes         No          No         Yes
  Export to PDF                Yes     Yes      Yes       Yes         Yes         Yes        Yes
  View history                 Yes     Yes      Yes       Yes         Yes         No         Yes

INCIDENT INVESTIGATION         Yes     Yes      Yes       Yes         No          No         Yes
  5 Why analysis               Yes     Yes      Yes       Yes         No          No         Yes
  Root cause guidance          Yes     Yes      Yes       Yes         No          No         Yes
  Corrective actions           Yes     Yes      Yes       Yes         No          No         Yes
  Investigation templates      Yes     Yes      Yes       Yes         No          No         Yes

SAFETY OBSERVATIONS            Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Record observation           Yes     Yes      Yes       Yes         Yes         Yes        Yes
  AI-assisted recommendation   Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Escalation workflow          Yes     Yes      Yes       Yes         No          No         Yes

EMERGENCY RESPONSE             Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Scenario-based guidance      Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Emergency checklists         Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Muster guidance              Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Escalation contacts          Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Quick-access cards           Yes     Yes      Yes       Yes         Yes         Yes        Yes

LEARNING & COMPETENCY          Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Micro-learning lessons       Yes     Yes      Yes       Yes         Yes         Yes        Yes
  HSE quizzes                  Yes     Yes      Yes       Yes         Yes         Yes        Yes
  Competency tracking          Yes     Yes      Yes       Yes         Yes         No         Yes
  Personalized learning        Yes     Yes      Yes       Yes         Yes         Yes        Yes

ANALYTICS DASHBOARD            Yes     Yes      Yes       No          No          No         Yes
  Usage analytics              Yes     Yes      Yes       No          No          No         Yes
  Risk trend analysis          Yes     Yes      Yes       No          No          No         Yes
  Competency gaps              Yes     Yes      Yes       No          No          No         Yes
  Department usage             Yes     Yes      Yes       No          No          No         Yes

GOVERNANCE                     Yes     Yes      Yes       No          No          No         Yes
  Content approval workflow    Yes     Yes      Yes       No          No          No         Yes
  AI response review           Yes     Yes      Yes       No          No          No         Yes
  Flagged response queue       Yes     Yes      Yes       No          No          No         Yes
  SME validation               Yes     Yes      Yes       No          No          No         Yes
  Version management           Yes     Yes      Yes       No          No          No         Yes

ADMINISTRATION                 Yes     No       No        No          No          No         No
  User management              Yes     No       No        No          No          No         No
  Role configuration           Yes     No       No        No          No          No         No
  AI model settings            Yes     No       No        No          No          No         No
  System configuration         Yes     No       No        No          No          No         No
  Audit log export             Yes     No       No        No          No          No         No

* Contractor access is scoped to contractor-specific documents and general safety guidance only
```

### 2.3 Authentication & Session Flow
```
[Login Page: /login]
  -> NEPL Employee ID input (format: NEPL-[DEPT]-[####], e.g. "NEPL-HSE-0042")
  -> Password input (masked, toggle visibility)
  -> "Remember me" checkbox (extends refresh token to 30 days)
  -> [POST /api/auth/login]
    -> Server validates:
        1. Find user by employeeId (case-insensitive)
        2. Verify bcrypt hash (cost factor 12)
        3. Check is_active = true
        4. Check account_status = 'active' (not 'suspended', 'locked', 'pending')
        5. Reset failed_login_attempts to 0
        6. Update last_login_at
        7. Log device info (userAgent, ipAddress)
    -> Generate tokens:
        - Access Token: JWT, 15 minutes, contains: { userId, role, department, location }
        - Refresh Token: JWT, 7 days (30 if remember me), stored in httpOnly cookie
    -> Log to audit_logs: action='login', ip_address, user_agent, device_fingerprint
    -> Response: { accessToken, refreshToken, user: { id, employeeId, fullName, role, department, location, permissions } }

  -> [Client]
    - Store accessToken in memory (Zustand store) -- NEVER localStorage
    - Store refreshToken in httpOnly cookie (server sets)
    - Set Axios default Authorization header
    - Initialize WebSocket connection for real-time notifications
    - Redirect based on role:
        Admin -> /admin/dashboard
        HSE Manager -> /governance/dashboard
        HSE Advisor -> /governance/content-review
        Supervisor -> /chat (operational interface)
        Field Worker -> /chat (voice-primary interface)
        Contractor -> /chat (scoped knowledge only)
        Auditor -> /analytics/governance

[Token Refresh Flow]
  -> Axios interceptor catches 401
  -> [POST /api/auth/refresh] with httpOnly cookie
  -> Server validates refresh token, issues new access token
  -> Retry original request
  -> If refresh fails -> redirect to /login with ?expired=true

[Password Reset Flow]
  -> User clicks "Forgot Password"
  -> [POST /api/auth/forgot-password] { employeeId }
  -> Server: ALWAYS returns 200 { message: "If account exists, reset instructions sent" }
    - Prevents user enumeration attacks
    - If user exists: generate reset token (UUID, 1 hour expiry)
    - Send email with link: /reset-password?token=xxx
  -> User clicks link, enters new password
  -> [POST /api/auth/reset-password] { token, newPassword }
  -> Validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  -> Update password_hash, clear reset_token, update password_changed_at
  -> Invalidate all existing sessions (force re-login)

[NEPL SSO Integration (Phase 6)]
  -> [GET /api/auth/sso/redirect]
  -> Redirect to NEPL Identity Provider (SAML 2.0 or OIDC)
  -> User authenticates on NEPL portal
  -> [POST /api/auth/sso/callback] with SAML assertion / ID token
  -> Server: Extract user attributes (employeeId, email, department, role mapping)
  -> If user exists: update attributes, generate tokens
  -> If user new: auto-create account with mapped role, send welcome email
  -> Redirect to app
```

---

## 3. COMPLETE DATABASE SCHEMA

### 3.1 Table Definitions (PostgreSQL + pgvector)

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    department VARCHAR(50),
    location VARCHAR(50),
    asset_type VARCHAR(30),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'locked', 'pending')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    sso_provider VARCHAR(30),
    sso_subject VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_department ON users(department);
```

#### roles
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(30) NOT NULL UNIQUE CHECK (name IN ('admin', 'hse_manager', 'hse_advisor', 'supervisor', 'field_worker', 'contractor', 'auditor')),
    display_name VARCHAR(50) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO roles (name, display_name, permissions) VALUES
('admin', 'System Administrator', '["*"]'),
('hse_manager', 'HSE Manager', '["chat:use", "knowledge:read", "knowledge:write", "risk:generate", "ptw:read", "toolbox:generate", "incident:generate", "observation:write", "emergency:read", "learning:read", "learning:write", "analytics:read", "governance:read", "governance:write", "reports:export"]'),
('hse_advisor', 'HSE Advisor', '["chat:use", "knowledge:read", "knowledge:write", "risk:generate", "ptw:read", "toolbox:generate", "incident:generate", "observation:write", "emergency:read", "learning:read", "learning:write", "governance:read", "governance:write"]'),
('supervisor', 'Supervisor', '["chat:use", "knowledge:read", "risk:generate", "ptw:read", "toolbox:generate", "incident:generate", "observation:write", "emergency:read", "learning:read"]'),
('field_worker', 'Field Worker', '["chat:use", "knowledge:read", "ptw:read", "toolbox:read", "observation:write", "emergency:read", "learning:read"]'),
('contractor', 'Contractor', '["chat:use", "knowledge:read:contractor", "ptw:read", "toolbox:read", "observation:write", "emergency:read", "learning:read"]'),
('auditor', 'Auditor', '["knowledge:read", "analytics:read", "governance:read", "reports:export"]');
```

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    context_summary TEXT,
    operational_context JSONB,
    session_type VARCHAR(30) DEFAULT 'general' CHECK (session_type IN ('general', 'risk_assessment', 'ptw_guidance', 'incident_investigation', 'toolbox_talk', 'emergency')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'flagged')),
    message_count INT DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_type ON chat_sessions(session_type);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'voice_transcript', 'structured', 'error')),
    voice_audio_url VARCHAR(255),
    model_used VARCHAR(50),
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    latency_ms INT,
    confidence_score DECIMAL(3,2),
    safety_flag BOOLEAN DEFAULT false,
    escalation_triggered BOOLEAN DEFAULT false,
    escalation_reason VARCHAR(100),
    governance_status VARCHAR(20) DEFAULT 'pending' CHECK (governance_status IN ('pending', 'approved', 'rejected', 'escalated')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_safety ON chat_messages(safety_flag) WHERE safety_flag = true;
CREATE INDEX idx_chat_messages_governance ON chat_messages(governance_status);
```

#### knowledge_categories
```sql
CREATE TABLE knowledge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES knowledge_categories(id),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    applicable_assets VARCHAR[] DEFAULT '{}',
    applicable_departments VARCHAR[] DEFAULT '{}',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO knowledge_categories (name, code, risk_level, applicable_assets) VALUES
('HSE Management System', 'HSE-MS', 'medium', '{"rig","platform","terminal","construction"}'),
('Process Safety', 'PSM', 'critical', '{"platform","terminal"}'),
('Drilling Safety', 'DRILL-SAFE', 'critical', '{"rig"}'),
('Lifting Operations', 'LIFT-OPS', 'high', '{"rig","platform","construction"}'),
('Confined Space Entry', 'CSE', 'critical', '{"rig","platform","terminal","construction"}'),
('Working at Height', 'WAH', 'high', '{"rig","platform","construction"}'),
('Electrical Safety', 'ELEC-SAFE', 'high', '{"rig","platform","terminal","construction"}'),
('Permit to Work', 'PTW', 'critical', '{"rig","platform","terminal","construction"}'),
('Emergency Response', 'EMERGENCY', 'critical', '{"rig","platform","terminal","construction"}'),
('Environmental Management', 'ENV-MGMT', 'high', '{"rig","platform","terminal","construction"}'),
('Contractor Safety', 'CONT-SAFE', 'medium', '{"rig","platform","terminal","construction"}'),
('Marine Operations', 'MARINE', 'high', '{"rig","platform"}'),
('SIMOPS', 'SIMOPS', 'critical', '{"rig","platform"}'),
('Incident Investigation', 'INC-INV', 'high', '{"rig","platform","terminal","construction"}'),
('Occupational Health', 'OCC-HEALTH', 'medium', '{"rig","platform","terminal","construction"}');
```

#### knowledge_documents
```sql
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    document_code VARCHAR(50) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES knowledge_categories(id),
    document_type VARCHAR(30) CHECK (document_type IN ('procedure', 'sop', 'manual', 'guideline', 'alert', 'lesson_learned', 'regulatory', 'emergency_plan')),
    description TEXT,
    file_url VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(50),
    content_hash VARCHAR(64),
    version VARCHAR(10) DEFAULT '1.0',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'archived', 'superseded')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    review_date DATE,
    expiry_date DATE,
    regulatory_mapping JSONB,
    metadata_tags VARCHAR[] DEFAULT '{}',
    risk_level VARCHAR(20),
    asset_types VARCHAR[] DEFAULT '{}',
    departments VARCHAR[] DEFAULT '{}',
    is_contractor_visible BOOLEAN DEFAULT false,
    is_emergency_critical BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_knowledge_docs_category ON knowledge_documents(category_id);
CREATE INDEX idx_knowledge_docs_status ON knowledge_documents(status);
CREATE INDEX idx_knowledge_docs_tags ON knowledge_documents USING GIN(metadata_tags);
CREATE INDEX idx_knowledge_docs_emergency ON knowledge_documents(is_emergency_critical) WHERE is_emergency_critical = true;
```

#### document_chunks
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    content_start INT,
    content_end INT,
    page_number INT,
    section_heading VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
```

#### embeddings (pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding VECTOR(3072) NOT NULL,
    model VARCHAR(50) DEFAULT 'text-embedding-3-large',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

#### citations
```sql
CREATE TABLE citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES document_chunks(id),
    relevance_score DECIMAL(3,2),
    excerpt TEXT,
    page_number INT,
    document_title VARCHAR(255),
    document_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_citations_message ON citations(message_id);
```

#### risk_assessments
```sql
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    assessment_type VARCHAR(20) CHECK (assessment_type IN ('JSA', 'TRA', 'hazard_id')),
    title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    location VARCHAR(100),
    department VARCHAR(50),
    asset_type VARCHAR(30),
    risk_matrix_config JSONB,
    overall_risk_rating VARCHAR(20),
    residual_risk_rating VARCHAR(20),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved', 'archived')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    pdf_url VARCHAR(255),
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### risk_assessment_steps
```sql
CREATE TABLE risk_assessment_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    activity_step TEXT NOT NULL,
    hazards TEXT[],
    risk_before_likelihood INT CHECK (risk_before_likelihood BETWEEN 1 AND 5),
    risk_before_severity INT CHECK (risk_before_severity BETWEEN 1 AND 5),
    risk_before_rating VARCHAR(20),
    control_measures TEXT[],
    risk_after_likelihood INT CHECK (risk_after_likelihood BETWEEN 1 AND 5),
    risk_after_severity INT CHECK (risk_after_severity BETWEEN 1 AND 5),
    risk_after_rating VARCHAR(20),
    responsible_person VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### toolbox_talks
```sql
CREATE TABLE toolbox_talks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    activity VARCHAR(100),
    location VARCHAR(100),
    crew_size INT,
    duration_minutes INT DEFAULT 15,
    discussion_points TEXT[],
    hazards TEXT[],
    controls TEXT[],
    questions TEXT[],
    environmental_conditions VARCHAR(100),
    pdf_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft',
    conducted_at TIMESTAMP WITH TIME ZONE,
    attendees UUID[],
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### observations
```sql
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    observation_type VARCHAR(30) CHECK (observation_type IN ('unsafe_act', 'unsafe_condition', 'near_miss', 'positive_observation', 'environmental')),
    category VARCHAR(50),
    description TEXT NOT NULL,
    location VARCHAR(100),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ai_recommendation TEXT,
    photo_urls TEXT[],
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'escalated')),
    assigned_to UUID REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### emergency_cards
```sql
CREATE TABLE emergency_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    scenario VARCHAR(50) CHECK (scenario IN ('gas_release', 'fire', 'medical', 'man_overboard', 'blowout', 'spill', 'evacuation', 'collision', 'structural')),
    category_id UUID REFERENCES knowledge_categories(id),
    priority INT DEFAULT 0,
    quick_actions TEXT[],
    checklist_items TEXT[],
    escalation_contacts JSONB,
    muster_points JSONB,
    equipment_needed TEXT[],
    related_documents UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### learning_modules
```sql
CREATE TABLE learning_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES knowledge_categories(id),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INT,
    content JSONB,
    media_urls TEXT[],
    prerequisites UUID[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### learning_quizzes
```sql
CREATE TABLE learning_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select')),
    options JSONB,
    explanation TEXT,
    points INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### competency_records
```sql
CREATE TABLE competency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    module_id UUID NOT NULL REFERENCES learning_modules(id),
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    score INT,
    max_score INT,
    completed_at TIMESTAMP WITH TIME ZONE,
    attempts INT DEFAULT 0,
    certificate_url VARCHAR(255),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);
```

#### governance_reviews
```sql
CREATE TABLE governance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id),
    document_id UUID REFERENCES knowledge_documents(id),
    review_type VARCHAR(30) CHECK (review_type IN ('ai_response', 'document_content', 'citation_accuracy')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'escalated')),
    flagged_by UUID NOT NULL REFERENCES users(id),
    flagged_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### analytics_events
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('chat_query', 'document_view', 'risk_assessment_created', 'toolbox_generated', 'observation_submitted', 'module_started', 'module_completed', 'emergency_card_viewed', 'voice_query', 'search_query', 'export_generated')),
    session_id UUID REFERENCES chat_sessions(id),
    entity_type VARCHAR(30),
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject', 'flag', 'escalate', 'ai_query', 'ai_response', 'document_upload', 'document_approve')),
    entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('user', 'chat_session', 'chat_message', 'knowledge_document', 'document_chunk', 'risk_assessment', 'toolbox_talk', 'observation', 'learning_module', 'governance_review')),
    entity_id UUID,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. API SPECIFICATION

### 4.1 Request/Response Standards
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ErrorCodes = {
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid employee ID or password' },
  ACCOUNT_LOCKED: { status: 403, message: 'Account locked. Contact admin.' },
  TOKEN_EXPIRED: { status: 401, message: 'Session expired. Please login again.' },
  UNAUTHORIZED: { status: 403, message: 'You do not have permission for this action' },
  VALIDATION_ERROR: { status: 400, message: 'Invalid input data' },
  AI_SERVICE_UNAVAILABLE: { status: 503, message: 'AI service temporarily unavailable' },
  SAFETY_ESCALATION: { status: 200, message: 'Query requires human escalation', escalation: true },
  KNOWLEDGE_NOT_FOUND: { status: 404, message: 'No relevant knowledge found for this query' },
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded. Please slow down.' },
  INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred' }
};
```

### 4.2 Authentication Endpoints

POST /api/auth/login
- Body: { employeeId: string, password: string, rememberMe?: boolean }
- Response: { accessToken, refreshToken, user: { id, employeeId, fullName, role, department, location, permissions } }

POST /api/auth/refresh
- Cookie: httpOnly refresh token
- Response: { accessToken: string }

POST /api/auth/logout
- Headers: Authorization: Bearer {accessToken}
- Response: 204

POST /api/auth/forgot-password
- Body: { employeeId: string }
- Response: 200 { message: "If account exists, reset instructions sent" }

POST /api/auth/reset-password
- Body: { token: string, newPassword: string }
- Validation: min 8 chars, 1 upper, 1 lower, 1 number, 1 special

### 4.3 Chat Endpoints

POST /api/chat/sessions
- Body: { title?: string, operationalContext?: { asset?, activity?, location? }, sessionType?: string }
- Response: ChatSession

GET /api/chat/sessions
- Query: { page, limit, status, sessionType }
- Response: { data: ChatSession[], meta }

GET /api/chat/sessions/:id
- Response: ChatSessionDetail with messages and citations

POST /api/chat/sessions/:id/messages
- Body: { content: string, contentType?: 'text' | 'voice_transcript', voiceAudioUrl?: string }
- Response: { message, aiResponse, citations, safetyFlags, escalationRequired }
- AI Pipeline: Query preprocessing -> Safety guardrail -> Semantic retrieval -> Context assembly -> LLM generation -> Post-processing -> Safety validation -> Response delivery

POST /api/chat/sessions/:id/messages/:messageId/flag
- Body: { reason: string, category: 'inaccurate' | 'unsafe' | 'outdated' | 'hallucination' | 'other' }
- Creates governance_reviews entry

POST /api/chat/sessions/:id/messages/stream
- WebSocket or SSE for real-time token streaming

### 4.4 Knowledge Base Endpoints

GET /api/knowledge/documents
- Query: { search?, categoryId?, documentType?, status?, riskLevel?, assetType?, tags?, isContractorVisible?, sortBy? }
- Response: { data: KnowledgeDocumentSummary[], meta }

GET /api/knowledge/documents/:id
- Response: KnowledgeDocumentDetail with chunks, versions, citations

POST /api/knowledge/documents
- Body: multipart/form-data with file upload or text content
- Processing: Save file -> Extract text -> Chunk -> Generate embeddings -> Save
- Auth: Admin, HSE Manager, HSE Advisor

POST /api/knowledge/search
- Body: { query: string, categoryIds?, documentTypes?, limit?, minRelevance? }
- Response: { results: { chunk, document, relevanceScore, excerpt }[] }
- Implementation: Generate embedding -> pgvector similarity search -> Filter -> Return

GET /api/knowledge/categories
- Response: KnowledgeCategory[] (hierarchical tree)

GET /api/knowledge/emergency-cards
- Query: { scenario?, categoryId? }
- Response: EmergencyCard[]

### 4.5 Risk Assessment Endpoints

POST /api/risk-assessments
- Body: { assessmentType: 'JSA' | 'TRA' | 'hazard_id', title, activityDescription, location?, department?, assetType?, useAI? }
- If useAI: Retrieve procedures -> Build prompt -> LLM generation -> Parse steps -> Calculate risk ratings -> Save

GET /api/risk-assessments
- Query: { page, limit, assessmentType, status, userId, location }

GET /api/risk-assessments/:id
- Response: RiskAssessmentDetail with steps

POST /api/risk-assessments/:id/approve
- Auth: HSE Manager, Admin

POST /api/risk-assessments/:id/export
- Query: { format: 'pdf' | 'word' }

### 4.6 Toolbox Talk Endpoints

POST /api/toolbox-talks/generate
- Body: { activity, location?, crewSize?, durationMinutes?, environmentalConditions?, crewExperience? }
- AI Pipeline: Retrieve procedures -> Build prompt -> Generate discussion points, hazards, controls, questions -> Save

GET /api/toolbox-talks
- Query: { page, limit, activity, userId }

POST /api/toolbox-talks/:id/export
- Response: PDF file stream

POST /api/toolbox-talks/:id/conduct
- Mark as conducted, record attendees

### 4.7 PTW Guidance Endpoints

POST /api/ptw/check-requirements
- Body: { workCategory, location, assetType, simultaneousOperations?, hazardousMaterials?, isolationRequired? }
- Response: { permitRequired, permitType, requiredDocuments, isolationRequirements, gasTestingRequirements, ppeRequirements, simopsConflicts, emergencyProcedures, citations }

GET /api/ptw/work-categories
- Response: { categories: { id, name, riskLevel, description }[] }

### 4.8 Incident Investigation Endpoints

POST /api/incident-guidance/analyze
- Body: { incidentDescription, incidentType, severity, location, witnesses?, immediateActions? }
- Response: { fiveWhyAnalysis, rootCauses, contributingFactors, correctiveActions, investigationSteps, regulatoryNotifications, relatedIncidents, citations }

GET /api/incident-guidance/templates
- Response: InvestigationTemplate[]

### 4.9 Safety Observation Endpoints

POST /api/observations
- Body: { observationType, category, description, location, severity, photos? }
- AI Pipeline (async): Generate recommendation -> Suggest similar observations -> Suggest corrective actions -> Auto-assign

GET /api/observations
- Query: { page, limit, type, status, severity, userId, assignedTo }

PUT /api/observations/:id
- Update status, assign, add actions

### 4.10 Emergency Response Endpoints

GET /api/emergency/cards
- Query: { scenario?, priority? }
- Response: EmergencyCard[]

GET /api/emergency/cards/:id
- Response: EmergencyCardDetail with quick actions, checklist, contacts, muster points

POST /api/emergency/activate
- Body: { scenario, location, reportedBy }
- Response: { activationId, timestamp, emergencyCard, musterPoint, escalationContacts, actions, notificationsSent }

### 4.11 Learning & Competency Endpoints

GET /api/learning/modules
- Query: { page, limit, categoryId, difficulty, status }

GET /api/learning/modules/:id
- Response: LearningModuleDetail with quizzes and progress

POST /api/learning/modules/:id/start
- Response: { competencyRecord }

POST /api/learning/modules/:id/complete
- Body: { quizAnswers: { quizId, selectedOptions }[] }
- Response: { score, maxScore, passed, certificateUrl?, nextModule? }

GET /api/learning/competency
- Query: { userId? }
- Response: { overallProgress, completedModules, totalModules, certificates, gaps }

### 4.12 Governance Endpoints

GET /api/governance/reviews
- Query: { page, limit, status, priority, reviewType, assignedTo }
- Auth: Admin, HSE Manager, HSE Advisor

PUT /api/governance/reviews/:id
- Body: { status, reviewNotes? }
- Side-effects: Update message governance_status, notify flagger

### 4.13 Analytics Endpoints

GET /api/analytics/dashboard
- Auth: Admin, HSE Manager, Auditor
- Response: { usage, topics, risk, engagement, competency, governance }

GET /api/analytics/usage
- Query: { dateFrom, dateTo, groupBy, department?, assetType? }

GET /api/analytics/export
- Query: { reportType, format, dateFrom, dateTo }

### 4.14 Voice Interaction Endpoints

POST /api/voice/transcribe
- Body: multipart/form-data { audio: File, language?, noiseReduction? }
- Response: { transcript, confidence, durationMs }

POST /api/voice/synthesize
- Body: { text, voice?, speed? }
- Response: { audioUrl, durationMs }

---

## 5. AI SYSTEM ARCHITECTURE

### 5.1 RAG Pipeline
```
[User Query]
    |
[1. Query Preprocessing]
    - Clean and normalize query
    - Detect language (English only in MVP)
    - Extract operational context (asset, activity, location)
    - Detect query intent (informational, procedural, emergency)
    |
[2. Safety Guardrail Check]
    - Check against high-risk topic list
    - IF high-risk:
        -> Return escalation response
        -> Log governance flag
        -> Notify emergency contacts
    - ELSE: Continue
    |
[3. Semantic Retrieval]
    - Generate query embedding (Azure OpenAI text-embedding-3-large)
    - Search pgvector: top_k=5, min_relevance=0.7
    - Filter by: user role, asset type, department, document status='approved'
    - Rerank by relevance + recency
    |
[4. Context Assembly]
    - Build system prompt with retrieved chunks, user context, conversation history
    - Inject safety instructions
    |
[5. LLM Generation]
    - Model: Azure OpenAI GPT-4o
    - Temperature: 0.3 (low creativity for safety)
    - Max tokens: 2000
    - Structured output: JSON with content + citations
    |
[6. Post-Processing]
    - Extract citations, validate against retrieved chunks
    - Check for hallucinations
    - Format response with markdown
    |
[7. Safety Validation]
    - Check for contradictions, missing warnings, inappropriate recommendations
    - IF unsafe: flag for governance, return safe fallback
    |
[8. Response Delivery]
    - Save to chat_messages, save citations, stream to client, log analytics
```

### 5.2 Safety Guardrails
```typescript
const HIGH_RISK_TOPICS = [
  'major gas release', 'blowout', 'well control', 'SIMOPS conflict',
  'confined space rescue', 'live electrical work', 'h2s exposure',
  'explosion', 'fire offshore', 'man overboard', 'structural collapse',
  'toxic gas', 'radiation exposure'
];

const SAFETY_ESCALATION_RESPONSE = {
  content: `**STOP WORK - ESCALATION REQUIRED**

Your query involves a high-risk safety situation that requires immediate human oversight.

**Immediate Actions:**
1. Stop all work immediately
2. Notify your supervisor and HSE team
3. Follow emergency procedures

**Do not proceed without explicit approval from your supervisor and HSE team.**

This response has been logged for review.`,
  escalationTriggered: true,
  citations: []
};
```

### 5.3 Prompt Templates

System Prompt (Chat Assistant):
```
You are HSE OPS AI, an HSE operational support assistant for NEPL (Nigerian oil & gas operations).

CONTEXT:
- User Role: {userRole}
- Department: {userDepartment}
- Location: {userLocation}
- Asset Type: {userAssetType}
- Current Activity: {currentActivity}

RETRIEVED DOCUMENTS:
{retrievedChunks}

INSTRUCTIONS:
1. Answer based ONLY on the retrieved documents above.
2. Cite sources using [Document: CODE, Page: X] format.
3. If information is insufficient, say "I don't have enough information in the approved procedures. Please consult your HSE supervisor."
4. NEVER provide advice that contradicts the retrieved documents.
5. For high-risk activities, always include a safety warning.
6. Use Nigerian oil & gas terminology and regulatory references (NUPRC, NOSDRA, DPR).
7. Keep responses concise (max 3 paragraphs) for field use.
8. If the query is about an emergency, prioritize immediate safety actions.

SAFETY RULES:
- Always recommend "Stop work if unsafe" when appropriate
- Never suggest bypassing safety controls
- Always reference applicable permits (PTW, Cold Work, Hot Work)
- Include PPE requirements when relevant
- Mention gas testing requirements for confined space/hot work
```

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Technology Stack
- React 18.3+, Vite 5.0+, TypeScript 5.4+, Tailwind CSS 3.4+
- shadcn/ui, TanStack Query 5.0+, Zustand 4.5+, React Hook Form + Zod
- Recharts, Framer Motion, Lucide React, Sonner, date-fns
- react-markdown, jspdf, Web Speech API, vite-plugin-pwa

### 6.2 Key Components

Chat Interface:
- ChatInterface: Main chat container
- MessageBubble: User/AI message display with citations
- MessageInput: Text input with voice button
- VoiceInput: Microphone recording and transcription
- CitationPanel: Collapsible citation sidebar
- StreamingMessage: Real-time token display

Knowledge Base:
- DocumentCard: Document preview card
- DocumentViewer: Full document viewer with search
- SearchResults: Semantic search results
- CategoryTree: Hierarchical category navigation

Emergency:
- EmergencyCard: Quick-access emergency card
- QuickActionButton: Large tap targets for emergencies
- MusterMap: Visual muster point map
- ContactList: Escalation contacts

### 6.3 Offline Capability

Service Worker Strategies:
- App shell: Cache First
- Static assets: Stale While Revalidate (30 days)
- API responses: Network First (24h cache)
- Emergency cards: Cache First (7 days)
- Critical documents: Cache First (7 days)

Background Sync:
- sync-observations: Queue offline observations
- sync-chat-messages: Queue offline chat messages

IndexedDB Stores:
- chatMessages, observations, emergencyCards, criticalDocuments, toolboxTemplates, competencyProgress

---

## 7. DEVELOPMENT PHASES

### Phase 1: Foundation (Weeks 1-4)
- Project scaffolding, database schema, JWT auth, basic chat UI, knowledge upload, pgvector setup, simple RAG

### Phase 2: AI Core (Weeks 5-8)
- Advanced RAG with citations, safety guardrails, governance flagging, multi-turn conversations, streaming responses, semantic search

### Phase 3: Operational Modules (Weeks 9-14)
- JSA/TRA generation, toolbox talk generator, PTW guidance, incident investigation assistant, safety observations, emergency response cards

### Phase 4: Learning & Analytics (Weeks 15-18)
- Micro-learning modules, quiz system, competency tracking, analytics dashboard, usage reports, governance dashboard

### Phase 5: PWA & Voice (Weeks 19-22)
- Service worker, offline caching, background sync, voice input/output, mobile optimization, push notifications

### Phase 6: Enterprise Readiness (Weeks 23-28)
- NEPL SSO integration, load testing, security hardening, penetration testing, disaster recovery, production deployment

---

## 8. SECURITY ARCHITECTURE

### 8.1 Authentication
- JWT access token (15 min) + refresh token (7 days, httpOnly cookie)
- bcrypt password hashing (cost 12)
- Rate limiting: login 5/15min, API 100/min, AI queries 10/min
- Account lockout after 5 failed attempts (30 min)

### 8.2 AI Security
- Prompt injection sanitization
- Response data leakage detection
- Citation validation (prevent hallucinations)
- Safety escalation for high-risk topics
- Human-in-the-loop for critical decisions

### 8.3 Data Protection
- TLS encryption for all communications
- Input sanitization with Zod validation
- SQL injection prevention via Prisma ORM
- XSS prevention (React default + output sanitization)
- File upload restrictions (5MB, images only)
- Audit log immutability

---

## 9. TESTING STRATEGY

### AI Validation Testing
- High-risk query escalation
- Citation accuracy and existence
- Hallucination detection
- Safety guardrail enforcement
- Contradiction detection

### UAT Scenarios
1. Field worker asks about confined space entry -> Verify citation to NEPL CSE procedure
2. Supervisor generates JSA for lifting -> Verify risk matrix calculations
3. HSE Advisor flags inaccurate AI response -> Verify governance queue entry
4. User goes offline -> Verify emergency cards still accessible
5. Contractor logs in -> Verify scoped document access only
6. Voice query in noisy environment -> Verify Whisper fallback works
7. High-risk query (gas release) -> Verify escalation and STOP WORK message
8. Document upload -> Verify chunking, embedding, and searchability
9. Analytics dashboard -> Verify accurate usage metrics
10. Emergency activation -> Verify notifications sent to response team

---

## 10. CONTEXT FILES FOR AI-ASSISTED DEVELOPMENT

```
docs/
├── 01-project-overview.md
├── 02-business-case.md
├── 03-execution-roadmap.md
├── 04-ai-system-architecture.md
├── 05-prompt-engineering.md
├── 06-rag-retrieval-strategy.md
├── 07-vector-database-design.md
├── 08-ai-governance-framework.md
├── 09-response-guardrails.md
├── 10-regulatory-mapping.md
├── 11-backend-architecture.md
├── 12-database-schema.md
├── 13-authentication-security.md
├── 14-api-design.md
├── 15-frontend-architecture.md
├── 16-ui-ux-guidelines.md
├── 17-pwa-offline-strategy.md
├── 18-voice-interaction-design.md
├── 19-knowledge-taxonomy.md
├── 20-hse-topic-library.md
├── 21-incident-guidance-framework.md
├── 22-risk-assessment-logic.md
├── 23-toolbox-talk-framework.md
├── 24-analytics-kpis.md
├── 25-adoption-measurement.md
├── 26-deployment-architecture.md
├── 27-docker-kubernetes-strategy.md
├── 28-monitoring-observability.md
├── 29-coding-standards.md
├── 30-testing-strategy.md
├── 31-security-testing.md
├── 32-document-ingestion-pipeline.md
├── 33-content-approval-workflow.md
└── 34-version-control-policy.md
```

---

**END OF SPECIFICATION**
