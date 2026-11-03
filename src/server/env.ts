import { z } from "zod";

const connectionStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    { message: "Expected a postgres connection string." },
  );

export const serverEnvSchema = z.object({
  DATABASE_URL: connectionStringSchema.optional(),
  DIRECT_DATABASE_URL: connectionStringSchema.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: blankToUndefined(source.DATABASE_URL),
    DIRECT_DATABASE_URL: blankToUndefined(source.DIRECT_DATABASE_URL),
  });
}
