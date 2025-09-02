export const isEmptyObject = (obj: object): obj is Record<string, never> => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}
