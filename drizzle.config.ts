import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'mysql2',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'mysql://user:password@localhost:3306/omninotes',
  },
  verbose: true,
  strict: true,
});
