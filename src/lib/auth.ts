import { sql } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  grade_id: string | null;
  stream_id: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
}

const TOKEN_KEY = 'edutn-auth-token';
const USER_KEY = 'edutn-auth-user';

function generateToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Web Crypto API password hashing (browser-native, no Node deps)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computedHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computedHex === hashHex;
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return { user: null, error: 'An account with this email already exists' };
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (${email}, ${passwordHash}, ${fullName}, 'student')
    RETURNING id, email, full_name, avatar_url, role, grade_id, stream_id, bio, is_active, created_at
  `;

  const user = rows[0] as AuthUser;
  const token = generateToken();
  setSession(token, user);
  return { user, error: null };
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const rows = await sql`SELECT id, email, password_hash, full_name, avatar_url, role, grade_id, stream_id, bio, is_active, created_at FROM users WHERE email = ${email}`;
  if (rows.length === 0) {
    return { user: null, error: 'Invalid email or password' };
  }

  const row = rows[0] as AuthUser & { password_hash: string };
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return { user: null, error: 'Invalid email or password' };
  }

  const { password_hash: _ph, ...user } = row;
  const token = generateToken();
  setSession(token, user);
  return { user, error: null };
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function updateProfile(userId: string, updates: { full_name?: string; bio?: string; avatar_url?: string; grade_id?: string; stream_id?: string }): Promise<AuthUser | null> {
  const rows = await sql`
    UPDATE users SET
      full_name = COALESCE(${updates.full_name ?? null}, full_name),
      bio = COALESCE(${updates.bio ?? null}, bio),
      avatar_url = COALESCE(${updates.avatar_url ?? null}, avatar_url),
      grade_id = COALESCE(${updates.grade_id ?? null}, grade_id),
      stream_id = COALESCE(${updates.stream_id ?? null}, stream_id),
      updated_at = now()
    WHERE id = ${userId}
    RETURNING id, email, full_name, avatar_url, role, grade_id, stream_id, bio, is_active, created_at
  `;
  return (rows[0] as AuthUser) ?? null;
}
