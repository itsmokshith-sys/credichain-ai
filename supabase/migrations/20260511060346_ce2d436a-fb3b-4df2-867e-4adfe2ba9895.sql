
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('user', 'bank', 'admin');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Credit submission requests
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  age INT NOT NULL,
  loan_amount NUMERIC NOT NULL,
  due_amount NUMERIC NOT NULL,
  credits_used NUMERIC NOT NULL,
  repayment_history TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blockchain blocks
CREATE TABLE public.blocks (
  block_id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  credit_data JSONB NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL UNIQUE,
  request_id UUID REFERENCES public.requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_email ON public.blocks(user_email);
CREATE INDEX idx_requests_bank ON public.requests(bank_id);
CREATE INDEX idx_requests_status ON public.requests(status);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_roles policies (read-only to user, admin manages)
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own role on signup" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- requests policies
CREATE POLICY "Banks see their requests" ON public.requests FOR SELECT TO authenticated
  USING (
    bank_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'user') AND user_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  );
CREATE POLICY "Banks create requests" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (bank_id = auth.uid() AND public.has_role(auth.uid(), 'bank'));
CREATE POLICY "Admins update requests" ON public.requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- blocks policies (immutable - read only for relevant parties; only admin inserts via approval)
CREATE POLICY "Users see own blocks" ON public.blocks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR user_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'bank')
  );
CREATE POLICY "Admins insert blocks" ON public.blocks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
