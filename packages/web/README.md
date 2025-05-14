# Analytics dApp built on Zama fhEVM - web

## Overview

A frontend built with next.js frontend web framework.

## Development

```sh
# setup the environment
ln -sf ../.env .env
pnpm install
pnpm dev
```

Visit http://localhost:3010 to view the application.

Use `pnpm compile` to compile with **tsc** and perform type checking.

There are a few caveats:

- Webpack may report circular dependencies when including fhEVM web workers. This issue requires further investigation.
