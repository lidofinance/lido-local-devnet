import { AssertionError } from "node:assert";

export type NonEmptyArray<T> = [T, ...T[]];

export const isNonEmptyArray = <T>(arr: T[]): arr is NonEmptyArray<T> => arr.length > 0;

export const assertNonEmpty = <T>(
  array: T[],
  onEmpty?: (array: T[]) => Error
): NonEmptyArray<T> => {
  const onEmptyHandler = (array: T[]): never => {
    if (onEmpty) {
      throw onEmpty(array);
    }

    throw new AssertionError({ message: "Array is empty", expected: "Non empty array", actual: array })
  };

  return isNonEmptyArray(array) ? array : onEmptyHandler(array);
};
