import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // LLM Configuration
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for LangChain OpenAI operations'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  // Google Gemini (alternative)
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // WhatsApp Service Configuration
  ENABLE_WHATSAPP: z.string().default('true'),
  
  // Multi-tenant Restaurant Configuration
  DEFAULT_RESTAURANT_ID: z.string().default('burger-joint'),
  
  // Session Secret for JWT cookies
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').default('dineconnect_ultra_secure_session_secret_2026_change_in_production'),

  // VM Deployment (optional - for bot service)
  VM_HOST: z.string().optional(),
  VM_USER: z.string().default('ubuntu'),
  VM_SSH_KEY_PATH: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ [ENVIRONMENT ERROR] Invalid or missing environment configuration:\n${errorDetails}\n`);
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();

// Type exports for convenience
export type Env = z.infer<typeof envSchema>;