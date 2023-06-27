# Dumb Object Notation

**JSON is full of curly braces and quotation marks. Boring. Old.**

Why would you say `{"foo":"bar"}`, when you could say `[ foo => bar ]`?

## Introducing Dumb Object Notation

- JSON-compatible (JSON is valid DON)
- simpler (only strings and objects)
- dumb (and funny)
- every input is valid DON (no runtime errors)

### Installation

`[your package manager] install @prokopschield/don`

### Usage

```typescript
import DON from '@prokopschield/don';

DON.encode; // to encode objects
DON.decode; // to decode objects
```

**_Enjoy!_**
