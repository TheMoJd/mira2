import { defineConfig } from 'vitest/config';

// Tests unitaires (logique pure + functions mockées). Aucun service externe :
// OpenAI / Supabase sont mockés, donc la suite tourne en autonomie et sans coût.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'],
  },
});
