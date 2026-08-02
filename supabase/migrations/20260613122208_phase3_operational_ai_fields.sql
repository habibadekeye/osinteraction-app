-- Phase 3: Add AI analysis fields to operational tables\n\nALTER TABLE incident_reports\n  ADD COLUMN IF NOT EXISTS ai_analysis jsonb,\n  ADD COLUMN IF NOT EXISTS five_whys jsonb DEFAULT '[]',\n  ADD COLUMN IF NOT EXISTS corrective_actions jsonb DEFAULT '[]';
\n\nALTER TABLE observations\n  ADD COLUMN IF NOT EXISTS ai_recommendation_data jsonb;
\n\nALTER TABLE permit_to_work\n  ADD COLUMN IF NOT EXISTS requirements_checklist jsonb DEFAULT '[]',\n  ADD COLUMN IF NOT EXISTS ai_guidance jsonb;
\n\n-- Add ai_generated flag to risk_assessments if missing\nALTER TABLE risk_assessments\n  ADD COLUMN IF NOT EXISTS department text;
\n;
