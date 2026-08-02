export type UserRole =
  | 'admin'
  | 'hse_manager'
  | 'hse_advisor'
  | 'supervisor'
  | 'field_worker'
  | 'contractor'
  | 'auditor';

export interface Profile {
  id: string;
  employee_id: string;
  full_name: string;
  role: UserRole;
  department: string;
  location: string;
  asset_type: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  session_type: string;
  status: string;
  operational_context: Record<string, unknown>;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface Citation {
  document_title: string;
  document_code: string;
  excerpt: string;
  relevance_score: number;
  page?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: string;
  confidence_score?: number;
  safety_flag: boolean;
  escalation_triggered: boolean;
  escalation_reason?: string;
  governance_status: string;
  citations: Citation[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  applicable_assets: string[];
  display_order: number;
  is_active: boolean;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  document_code: string;
  category_id: string;
  document_type: string;
  description: string;
  content?: string;
  version: string;
  status: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  is_contractor_visible: boolean;
  is_emergency_critical: boolean;
  metadata_tags: string[];
  embedding_status?: 'processing' | 'indexed' | 'embedded' | 'failed' | 'skipped' | null;
  file_storage_key?: string | null;
  file_original_name?: string | null;
  file_size_bytes?: number | null;
  created_at: string;
  updated_at: string;
  knowledge_categories?: KnowledgeCategory;
}

export interface EmergencyCard {
  id: string;
  title: string;
  scenario: string;
  severity: 'high' | 'critical';
  quick_actions: string[];
  checklist_items: string[];
  equipment_needed: string[];
  color: string;
  icon: string;
  escalation_contacts: EscalationContact[];
  is_active: boolean;
}

export interface EscalationContact {
  name: string;
  phone: string;
}

export interface RiskAssessment {
  id: string;
  user_id: string;
  assessment_type: 'JSA' | 'TRA' | 'hazard_id';
  title: string;
  activity_description?: string;
  location?: string;
  department?: string;
  asset_type?: string;
  overall_risk_rating?: string;
  residual_risk_rating?: string;
  status: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; employee_id: string };
  risk_assessment_steps?: RiskAssessmentStep[];
}

export interface RiskAssessmentStep {
  id: string;
  assessment_id: string;
  step_number: number;
  activity_step: string;
  hazards: string[];
  risk_before_likelihood: number;
  risk_before_severity: number;
  risk_before_rating: string;
  control_measures: string[];
  risk_after_likelihood: number;
  risk_after_severity: number;
  risk_after_rating: string;
  responsible_person: string;
}

export interface ToolboxTalk {
  id: string;
  user_id: string;
  title: string;
  activity?: string;
  location?: string;
  crew_size: number;
  duration_minutes: number;
  discussion_points: string[];
  hazards: string[];
  controls: string[];
  questions: string[];
  environmental_conditions?: string;
  status: string;
  conducted_at?: string;
  ai_generated: boolean;
  created_at: string;
  profiles?: { full_name: string };
}

export interface Observation {
  id: string;
  user_id: string;
  observation_type: string;
  category?: string;
  description: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ai_recommendation?: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string; employee_id: string };
}

export interface GovernanceReview {
  id: string;
  message_id?: string;
  review_type: string;
  status: string;
  flagged_by: string;
  flagged_reason?: string;
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  priority: string;
  created_at: string;
  flagged_by_profile?: { full_name: string; employee_id: string };
  chat_messages?: { content: string };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'System Administrator',
  hse_manager: 'HSE Manager',
  hse_advisor: 'HSE Advisor',
  supervisor: 'Supervisor',
  field_worker: 'Field Worker',
  contractor: 'Contractor',
  auditor: 'Auditor',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  hse_manager: 'bg-blue-100 text-blue-700',
  hse_advisor: 'bg-cyan-100 text-cyan-700',
  supervisor: 'bg-orange-100 text-orange-700',
  field_worker: 'bg-green-100 text-green-700',
  contractor: 'bg-yellow-100 text-yellow-700',
  auditor: 'bg-gray-100 text-gray-700',
};

export const DEMO_ACCOUNTS = [
  { employeeId: 'NEPL-ADM-0001', email: 'admin@safeops.demo', password: 'SafeOps2024!', role: 'admin' as UserRole, name: 'Samuel Adeyemi', department: 'IT/HSE Systems', location: 'Lagos HQ' },
  { employeeId: 'NEPL-HSE-0042', email: 'manager@safeops.demo', password: 'SafeOps2024!', role: 'hse_manager' as UserRole, name: 'Dr. Ngozi Okafor', department: 'HSE', location: 'Bonga FPSO' },
  { employeeId: 'NEPL-HSE-0087', email: 'advisor@safeops.demo', password: 'SafeOps2024!', role: 'hse_advisor' as UserRole, name: 'Chukwuemeka Eze', department: 'HSE', location: 'Port Harcourt' },
  { employeeId: 'NEPL-OPS-0156', email: 'supervisor@safeops.demo', password: 'SafeOps2024!', role: 'supervisor' as UserRole, name: 'Tunde Bakare', department: 'Operations', location: 'EA Field' },
  { employeeId: 'NEPL-OPS-0789', email: 'fieldworker@safeops.demo', password: 'SafeOps2024!', role: 'field_worker' as UserRole, name: 'Emeka Obi', department: 'Drilling', location: 'Okono Platform' },
  { employeeId: 'NEPL-AUD-0012', email: 'auditor@safeops.demo', password: 'SafeOps2024!', role: 'auditor' as UserRole, name: 'Amaka Nwosu', department: 'Internal Audit', location: 'Lagos HQ' },
];
