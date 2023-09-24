import { z } from 'zod';
import { drizzleJsonColumn } from './load.js';

export type JsonColumType = z.input<typeof drizzleJsonColumn>;
