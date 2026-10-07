// Writes config.schema.json so editors can validate and autocomplete config files.
import { writeFileSync } from 'node:fs';
import * as z from 'zod';
import { Config } from '../lib/config.ts';

const schema = z.toJSONSchema(Config, { io: 'input' });
writeFileSync(new URL('../config.schema.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
