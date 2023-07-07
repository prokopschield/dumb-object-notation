#!/usr/bin/env node

import { DonNode } from '.';

process.stdin.on('data', (data) =>
	console.log(DonNode.decode(data.toString()).fmt())
);
