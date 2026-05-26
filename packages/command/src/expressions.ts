/**
 * Template expression resolver for YAML stand configs.
 *
 * Supports `${{ expression }}` tokens within string values. Expressions are
 * dotted paths resolved against a context object. Strings may contain multiple
 * expressions (interpolation) — e.g. `${{ network.name }}-ao`.
 *
 * Throws on unresolved expressions (fail-fast).
 */

export interface ExpressionContext {
  services: unknown;
  network: { name: string };
  artifacts: string;
}

const EXPR_RE = /\$\{\{\s*([^}]+?)\s*\}\}/g;

const resolvePath = (path: string, ctx: unknown): unknown =>
  path.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object" && key in (obj as object)) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);

const resolveString = (str: string, ctx: ExpressionContext): string =>
  str.replaceAll(EXPR_RE, (match, expr: string) => {
    const resolved = resolvePath(expr.trim(), ctx);
    if (resolved === undefined || resolved === null) {
      throw new Error(`Cannot resolve expression: ${match}`);
    }
    return String(resolved);
  });

export const resolveExpressions = <T>(value: T, ctx: ExpressionContext): T => {
  if (typeof value === "string") {
    return resolveString(value, ctx) as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolveExpressions(v, ctx)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveExpressions(v, ctx),
      ]),
    ) as T;
  }

  return value;
};
