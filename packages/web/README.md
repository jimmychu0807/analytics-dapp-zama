# Analytics dApp built on Zama fhEVM - web

## Overview

A frontend built with next.js frontend web framework

## Development

```sh
# setup the environment
ln -sf ../.env .env
pnpm install
pnpm dev
```

Visit http://localhost:3010 to see the page

Use `pnpm compile` to compile with **tsc** and perform type checking.

There are a few caveats:

- webpack will report circular dependencies when including fhEVM web workers. It needs to be further look into.
