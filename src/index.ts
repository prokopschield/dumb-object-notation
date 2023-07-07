import Json from 'doge-json';

const escape_map: Record<string, (_tape: string[]) => string> = {
	b: () => '\b',
	f: () => '\f',
	n: () => '\n',
	r: () => '\r',
	t: () => '\t',
	u: (tape: string[]) => {
		const four = tape.splice(0, 4);
		const num = Number(`0x${four}`);

		if (num === num) {
			try {
				return String.fromCodePoint(num);
			} catch {
				// ignore range error
			}
		}

		tape.unshift(...four);

		return '\\u';
	},
};

function trimTape(tape: string[]): void {
	while (tape.length && !tape[0].trim()) {
		tape.shift();
	}
}

function encodeString(str: string): string {
	if (/^[a-z0-9-._~]+$/.test(str)) {
		return str;
	} else {
		return Json.encode(str);
	}
}

function encodeValue(val: string | DonNode): string {
	if (typeof val === 'string') {
		return encodeString(val);
	} else {
		return val.toString();
	}
}

export class DonNode extends Map<string, DonNode | string> {
	nextKey() {
		for (let i = 0; ; ++i) {
			const key = String(i);

			if (!this.has(key)) {
				return key;
			}
		}
	}

	push(value: string | DonNode) {
		this.set(this.nextKey(), value);
	}

	toFlat(): Record<string, string | object> | Array<string | object> {
		if (this.nextKey() === this.size.toString()) {
			return [...Array(this.size).keys()].map((key: number) => {
				const value = this.get(String(key)) || '';

				return typeof value === 'string' ? value : value.toFlat();
			});
		}

		const flat: Record<string, string | object> = {};

		for (const [key, value] of this.entries()) {
			if (!(key in flat)) {
				flat[key] = typeof value === 'string' ? value : value.toFlat();
			}
		}

		return flat;
	}

	toString() {
		let counter = 0;

		return (
			'[' +
			[...this]
				.map(([key, value]) => {
					if (key === String(counter)) {
						++counter;

						return encodeValue(value);
					} else {
						return `${encodeString(key)} => ${encodeValue(value)}`;
					}
				})
				.join(', ') +
			']'
		);
	}

	static decode(encoded: string): DonNode {
		return this.read(encoded.trim().split(''));
	}

	static readQuotedString(tape: string[]): string {
		let ec = tape.shift() || '"';
		let buffer = [];

		var c;

		while ((c = tape.shift()) !== ec && c) {
			if (c === '\\') {
				const nc = tape.shift() || '\\';

				if (nc in escape_map) {
					buffer.push(escape_map[nc](tape));
				} else {
					buffer.push(nc);
				}
			} else {
				buffer.push(c);
			}
		}

		return buffer.join('');
	}

	static readString(tape: string[], any = false): string {
		if (tape[0] === "'" || tape[0] === '"') {
			return this.readQuotedString(tape);
		}

		let buffer = [];

		for (let c = tape.shift(); c !== undefined; c = tape.shift()) {
			if (c === '\\') {
				const nc = tape.shift() || '\\';

				if (nc in escape_map) {
					buffer.push(escape_map[nc](tape));
				} else {
					buffer.push(nc);
				}
			} else if (
				c !== ',' &&
				c !== ':' &&
				c !== ']' &&
				c !== '}' &&
				!(c === '=' && tape[0] === '>')
			) {
				buffer.push(c);
			} else if (any && !buffer.length) {
				buffer.push(c);
			} else {
				tape.unshift(c);

				break;
			}
		}

		return buffer.join('').trim();
	}

	static readObject(tape: string[]): DonNode {
		const node = new DonNode();

		let key = '';

		tape.shift();

		while (
			(trimTape(tape), tape[0] !== ']' && tape[0] !== '}' && tape.length)
		) {
			let item = this.readItem(tape);

			trimTape(tape);

			if (item instanceof DonNode) {
				if (key) {
					node.set(key, item);
				} else {
					node.push(item);
				}

				key = '';

				trimTape(tape);

				if (tape[0] === ',' || tape[0] === ';') {
					tape.shift();
				}

				trimTape(tape);

				continue;
			}

			if (tape[0] === '=' && tape[1] === '>') {
				tape.splice(0, 2, ':');
			}

			if (tape[0] === ':') {
				if (key) {
					node.push(key);
				}

				key = item;

				tape.shift();

				continue;
			}

			if (key) {
				node.set(key, item);
				key = '';
			} else {
				node.push(item);
			}

			trimTape(tape);

			if (tape[0] === ',' || tape[0] === ';') {
				tape.shift();
			}
		}

		tape.shift();

		return node;
	}

	static readItem(tape: string[], any = false): DonNode | string {
		trimTape(tape);

		if (tape[0] === '{' || tape[0] === '[') {
			return this.readObject(tape);
		} else {
			return this.readString(tape, any);
		}
	}

	static read(tape: string[]): DonNode {
		const first = this.readItem(tape);

		trimTape(tape);

		if (tape.length || !(first instanceof DonNode)) {
			const node = new DonNode();

			for (let item = first; ; item = this.readItem(tape, true)) {
				node.push(item);
				trimTape(tape);

				if (!tape.length) {
					break;
				}
			}

			return node;
		}

		return first;
	}
}

export function encode<T>(item: T, stack = new Array<any>()): string {
	if (typeof item !== 'object') {
		return encodeString(String(item));
	}

	if (item instanceof DonNode) {
		return item.toString();
	}

	if (item === null) {
		return 'null';
	}

	const node = new DonNode();

	for (const [key, value] of Object.entries(item)) {
		if (stack.includes(value)) {
			continue;
		}

		node.set(
			key,
			value && typeof value === 'object'
				? DonNode.decode(encode(value, [...stack, value]))
				: String(value)
		);
	}

	return node.toString();
}

export function decode(encoded: string) {
	return DonNode.decode(encoded).toFlat();
}

export default { encode, decode, DonNode };
