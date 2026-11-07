
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
  };
};

const SESSION_KEY = 'umsspira_supabase_session';

function validateConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Falta configurar la URL o la clave pública de Supabase.',
    );
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<SupabaseSession> {
  validateConfig();

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.msg || data.message || data.error_description ||
      'No se pudo iniciar sesión.',
    );
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  return data as SupabaseSession;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(SESSION_KEY);

  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as SupabaseSession;

    return session.access_token || null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}
