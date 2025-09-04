export const isEmptyObject = (obj: object | unknown): obj is Record<string, never> => {
  if (typeof obj !== 'object' || obj === null) {
    return true;
  }

  if (obj === undefined) {
    return true;
  }

  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}
