import { neon } from '@neondatabase/serverless';

const connectionString = import.meta.env.VITE_NEON_DB_URL as string;

export const sql = neon(connectionString);

// Helper: run a SELECT query and return rows as typed array
export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return sql(strings, ...values) as Promise<T[]>;
}
