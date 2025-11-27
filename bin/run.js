#!/usr/bin/env node

import {execute} from '@oclif/core';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

await execute({dir: import.meta.url})
