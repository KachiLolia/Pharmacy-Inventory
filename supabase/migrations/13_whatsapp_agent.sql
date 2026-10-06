-- Stage 15 & 16: WhatsApp Agent

-- 1. Add WhatsApp number to app_users so we can securely identify incoming texts
ALTER TABLE public.app_users 
ADD COLUMN whatsapp_number TEXT UNIQUE;

-- 2. Create a table to store the agent's conversational memory (context) per user
CREATE TABLE public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
    BEFORE UPDATE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (though only accessed server-side via service role)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Only Admins and the backend (service_role) should touch these
CREATE POLICY "Admins can manage whatsapp sessions" 
    ON public.whatsapp_sessions 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage whatsapp sessions" 
    ON public.whatsapp_sessions 
    FOR ALL 
    TO service_role 
    USING (true);

