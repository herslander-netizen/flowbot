-- Modelo de dados para backend futuro, ainda NAO aplicado.
-- Role da API: sem BYPASSRLS. Tenant vem da autenticacao do servidor.
-- Usar SET LOCAL app.tenant_id = UUID validado em cada transacao.
BEGIN;
CREATE SCHEMA IF NOT EXISTS flowbot_prospeccao;

CREATE TABLE IF NOT EXISTS flowbot_prospeccao.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name varchar(140) NOT NULL,
  normalized_name varchar(160) NOT NULL,
  cnpj varchar(14),
  city varchar(100),
  uf char(2),
  category varchar(80),
  website text,
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  stage text NOT NULL DEFAULT 'pesquisado'
    CHECK (stage IN ('pesquisado','lead','qualificado','proposta','negociacao','ganho','perdido')),
  suppressed boolean NOT NULL DEFAULT false,
  source_type text NOT NULL,
  notes varchar(1000) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_cnpj_unique
  ON flowbot_prospeccao.organizations (tenant_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS organizations_tenant_stage
  ON flowbot_prospeccao.organizations (tenant_id, stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS flowbot_prospeccao.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  fact varchar(300) NOT NULL,
  source_url text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, organization_id)
    REFERENCES flowbot_prospeccao.organizations (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS evidence_tenant_org
  ON flowbot_prospeccao.evidence (tenant_id, organization_id);

-- Aprovar texto NAO concede consentimento para contato.
CREATE TABLE IF NOT EXISTS flowbot_prospeccao.outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  body varchar(4000) NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','cancelled')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, organization_id)
    REFERENCES flowbot_prospeccao.organizations (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flowbot_prospeccao.contact_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','telefone')),
  basis text NOT NULL CHECK (basis IN ('opt_in','legitimate_interest_reviewed')),
  proof_reference text NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY (tenant_id, organization_id)
    REFERENCES flowbot_prospeccao.organizations (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flowbot_prospeccao.activity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid,
  event_type varchar(80) NOT NULL,
  actor_id uuid,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, organization_id)
    REFERENCES flowbot_prospeccao.organizations (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS activity_tenant_time
  ON flowbot_prospeccao.activity_events (tenant_id, occurred_at DESC);

DO $$
DECLARE tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'organizations','evidence','outreach_drafts','contact_permissions','activity_events'
  ] LOOP
    EXECUTE format('ALTER TABLE flowbot_prospeccao.%I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE flowbot_prospeccao.%I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON flowbot_prospeccao.%I', tabela);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON flowbot_prospeccao.%I
       USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)
       WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      tabela
    );
  END LOOP;
END $$;
COMMIT;
