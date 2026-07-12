-- Supabase migration file for CMO Angel AI Assistant tables

-- 1. AI Conversations: store chat messages and responses
create table if not exists ai_conversations (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null,
  user_id text not null references members(id) on delete cascade,
  message text not null,
  response text not null,
  tools_used text[],
  timestamp timestamptz default timezone('utc', now()) not null
);

-- 2. AI Sessions: logical conversation groupings
create table if not exists ai_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null references members(id) on delete cascade,
  title text not null,
  created_at timestamptz default timezone('utc', now()) not null
);

-- 3. AI Feedback: ratings and comments
create table if not exists ai_feedback (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references ai_conversations(id) on delete cascade,
  user_id text not null references members(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamptz default timezone('utc', now()) not null
);

-- 4. Prompt Templates: predefined system/utility templates
create table if not exists prompt_templates (
  id uuid default gen_random_uuid() primary key,
  category text not null, -- e.g., 'announcements', 'letters', 'minutes'
  template text not null,
  description text
);

-- 5. Knowledge Documents: source documents for RAG (retrieval)
create table if not exists knowledge_documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null, -- e.g., 'constitution', 'welfare_guidelines', 'minutes'
  source text not null,
  content text not null,
  embedding_reference text, -- placeholder for vector DB reference if using pgvector
  uploaded_by text references members(id) on delete set null,
  created_at timestamptz default timezone('utc', now()) not null
);

-- Indexing for fast analytical query references
create index if not exists ai_conv_user_id_idx on ai_conversations (user_id);
create index if not exists ai_feedback_rating_idx on ai_feedback (rating);
create index if not exists doc_category_idx on knowledge_documents (category);
