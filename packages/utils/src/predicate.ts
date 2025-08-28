export type Constructor<T> = new (...args: any[]) => T;

/**
 * Composable type guard to check that the value is not type B
 * Examples:
 * * `not(isInstance(SomeClass))`
 * * `not(isNumber())`
 * * `not((value: unknown): value is string => (typeof value === 'string'))`
 */
export const not = <A, B>(
  guard:
    ((bValue: A | B) => bValue is B)
): (value: A | B) => value is Exclude<typeof value, B> =>
  (value): value is Exclude<typeof value, B> => !guard(value);


export const isInstance = <A, B>(clazz: Constructor<B>): (value: A | B) => value is B =>
  (v): v is B => v instanceof clazz;


export function isNumber(value: unknown): value is number;
export function isNumber(): (value: unknown) => value is number;
export function isNumber(value?: unknown): any {
  return arguments.length === 0
    ? (v: unknown): v is number => typeof v === "number"
    : typeof value === "number";
}


export function isString(value: unknown): value is string;
export function isString(): (value: unknown) => value is string;
export function isString(value?: unknown): any {
  return arguments.length === 0
    ? (v: unknown): v is string => typeof v === "string"
    : typeof value === "string";
}

export function isNull(value: unknown): value is null;
export function isNull(): (value: unknown) => value is null;
export function isNull(value?: unknown): any {
  return arguments.length === 0
    ? (v: unknown): v is null => v === null
    : value === null;
}
