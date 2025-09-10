#!/usr/bin/env -S node --loader ts-node/esm --disable-warning=ExperimentalWarning

// eslint-disable-next-line n/shebang
import {execute} from '@oclif/core';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

await execute({development: true, dir: import.meta.url})
