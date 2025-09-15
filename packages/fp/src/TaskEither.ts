// eslint-disable unicorn/filename-case

import { isLeft } from 'fp-ts/lib/Either.js';
import { TaskEither } from 'fp-ts/lib/TaskEither.js';

export * from 'fp-ts/lib/TaskEither.js';

/**
 * Perform TaskEither, return result (right side) or throw error (left side)
 * @template E - left side
 * @template A - right side
 * @returns {Promise<A>}
 * @throws {E} - error
 */
export const execute = async <E, A>(task: TaskEither<E, A>): Promise<A> => {
  const either = await task();

  if (isLeft(either)) {

    throw either.left;
  }

  return either.right;
};
