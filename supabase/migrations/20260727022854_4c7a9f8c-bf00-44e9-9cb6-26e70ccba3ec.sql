-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  allow_overdraft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ACCOUNTS
CREATE TYPE public.account_type AS ENUM ('bank', 'cash', 'ewallet', 'other');

CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type public.account_type NOT NULL DEFAULT 'bank',
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accounts_user_idx ON public.accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_own" ON public.accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- TRANSACTIONS
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'atm_withdrawal', 'transfer');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  transaction_date DATE NOT NULL,
  category TEXT,
  description TEXT,
  payment_method TEXT,
  receipt_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_idx ON public.transactions(user_id, transaction_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own" ON public.transactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ownership validation: accounts referenced must belong to the same user
CREATE OR REPLACE FUNCTION public.validate_transaction() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = NEW.account_id AND a.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Source account does not belong to this user';
  END IF;
  IF NEW.to_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts a WHERE a.id = NEW.to_account_id AND a.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Destination account does not belong to this user';
  END IF;
  IF NEW.transaction_type IN ('transfer','atm_withdrawal') THEN
    IF NEW.to_account_id IS NULL THEN RAISE EXCEPTION 'Destination account is required'; END IF;
    IF NEW.to_account_id = NEW.account_id THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER transactions_validate BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_transaction();

-- profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- admin stats (no financial detail exposed)
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, created_at TIMESTAMPTZ, account_count BIGINT, transaction_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.created_at,
    (SELECT count(*) FROM public.accounts a WHERE a.user_id = p.id),
    (SELECT count(*) FROM public.transactions t WHERE t.user_id = p.id)
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.admin_user_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_stats() TO authenticated;