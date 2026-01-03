-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    notion_page_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_notion_page_id ON projects(notion_page_id);

-- ============================================
-- FILES
-- ============================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    extracted_text TEXT,
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_processing_status ON files(processing_status);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_embedding ON files USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- AGENT_MESSAGES
-- ============================================
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tokens_used INTEGER,
    model VARCHAR(100),
    parent_message_id UUID REFERENCES agent_messages(id),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_messages_project_id ON agent_messages(project_id);
CREATE INDEX idx_agent_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX idx_agent_messages_role ON agent_messages(role);
CREATE INDEX idx_agent_messages_created_at ON agent_messages(created_at DESC);
CREATE INDEX idx_agent_messages_parent ON agent_messages(parent_message_id);
CREATE INDEX idx_agent_messages_embedding ON agent_messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- DELIVERABLES
-- ============================================
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('wireframe', 'prototype', 'document', 'presentation', 'report', 'other')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'delivered')),
    content JSONB,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    notes TEXT,
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX idx_deliverables_type ON deliverables(type);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_deliverables_created_at ON deliverables(created_at DESC);

-- ============================================
-- WIREFRAMES
-- ============================================
CREATE TABLE wireframes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    page_type VARCHAR(100),
    uxpilot_id VARCHAR(255),
    uxpilot_url TEXT,
    svg_content TEXT,
    html_content TEXT,
    design_tokens JSONB DEFAULT '{}',
    components JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'exported')),
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wireframes_project_id ON wireframes(project_id);
CREATE INDEX idx_wireframes_deliverable_id ON wireframes(deliverable_id);
CREATE INDEX idx_wireframes_uxpilot_id ON wireframes(uxpilot_id);
CREATE INDEX idx_wireframes_status ON wireframes(status);
CREATE INDEX idx_wireframes_page_type ON wireframes(page_type);
CREATE INDEX idx_wireframes_created_at ON wireframes(created_at DESC);

-- ============================================
-- VIBE_PROMPTS
-- ============================================
CREATE TABLE vibe_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    style_preferences JSONB DEFAULT '{}',
    color_palette JSONB DEFAULT '[]',
    typography JSONB DEFAULT '{}',
    mood_keywords TEXT[],
    reference_images TEXT[],
    industry VARCHAR(100),
    target_audience TEXT,
    brand_guidelines JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibe_prompts_project_id ON vibe_prompts(project_id);
CREATE INDEX idx_vibe_prompts_industry ON vibe_prompts(industry);
CREATE INDEX idx_vibe_prompts_created_at ON vibe_prompts(created_at DESC);
CREATE INDEX idx_vibe_prompts_embedding ON vibe_prompts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- VIBE_PROTOTYPES
-- ============================================
CREATE TABLE vibe_prototypes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    vibe_prompt_id UUID REFERENCES vibe_prompts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    v0_url TEXT,
    v0_id VARCHAR(255),
    preview_url TEXT,
    code_html TEXT,
    code_css TEXT,
    code_js TEXT,
    code_react TEXT,
    framework VARCHAR(50) DEFAULT 'react' CHECK (framework IN ('react', 'vue', 'svelte', 'html', 'nextjs')),
    design_system JSONB DEFAULT '{}',
    components_used TEXT[],
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'customizing', 'approved', 'exported')),
    iteration INTEGER DEFAULT 1,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibe_prototypes_project_id ON vibe_prototypes(project_id);
CREATE INDEX idx_vibe_prototypes_vibe_prompt_id ON vibe_prototypes(vibe_prompt_id);
CREATE INDEX idx_vibe_prototypes_v0_id ON vibe_prototypes(v0_id);
CREATE INDEX idx_vibe_prototypes_status ON vibe_prototypes(status);
CREATE INDEX idx_vibe_prototypes_framework ON vibe_prototypes(framework);
CREATE INDEX idx_vibe_prototypes_created_at ON vibe_prototypes(created_at DESC);

-- ============================================
-- NOTION_SYNCS
-- ============================================
CREATE TABLE notion_syncs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    notion_page_id VARCHAR(255) NOT NULL,
    notion_database_id VARCHAR(255),
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('page', 'database', 'block')),
    sync_direction VARCHAR(50) DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_notion', 'from_notion', 'bidirectional')),
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    sync_error TEXT,
    notion_content JSONB,
    local_content JSONB,
    field_mappings JSONB DEFAULT '{}',
    auto_sync BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notion_syncs_project_id ON notion_syncs(project_id);
CREATE INDEX idx_notion_syncs_notion_page_id ON notion_syncs(notion_page_id);
CREATE INDEX idx_notion_syncs_sync_status ON notion_syncs(sync_status);
CREATE INDEX idx_notion_syncs_last_synced_at ON notion_syncs(last_synced_at DESC);
CREATE INDEX idx_notion_syncs_auto_sync ON notion_syncs(auto_sync) WHERE auto_sync = true;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wireframes_updated_at
    BEFORE UPDATE ON wireframes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vibe_prompts_updated_at
    BEFORE UPDATE ON vibe_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vibe_prototypes_updated_at
    BEFORE UPDATE ON vibe_prototypes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_syncs_updated_at
    BEFORE UPDATE ON notion_syncs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional setup
-- ============================================
-- Uncomment and customize based on your auth requirements

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wireframes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vibe_prompts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vibe_prototypes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notion_syncs ENABLE ROW LEVEL SECURITY;
