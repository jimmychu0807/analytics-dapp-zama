# Analytics dApp built on Zama fhEVM - hardhat

The smart contracts of Analytics dApp, mainly:

- [contracts/Analytic.sol](./contracts/Analytic.sol)
- [contracts/QuestionSpecLib.sol](./contracts/QuestionSpecLib.sol)
- [interfaces/IAnalytic.sol](./interfaces/IAnalytic.sol)

## Setup

To run it locally, run both the hardhat node and a mocked fhEVM server that will perform encryption/decryption and listen to on-chain event from the Gateway contract.

```sh
# In one console
pnpm node
# In another console
pnpm mock-server
```

or

```sh
# Run them concurrently
pnpm dev
```

Gateway contract deployed on the hardhat node may stop emitting events after about 5-10 mins and the two components should be restart again, so you may want to run the two components separately and check the output of the mock-server.

## Development Approach

### Storage

### Algorithm

## Hardhat Tasks

After the [Setup](#setup) above, there are a few [hardhat tasks](./tasks/analytics.ts) to help test and setup test data on the smart contracts. Add `--help` at the end of each task to check the parameters needed.

- **analytics:newQuestion**: load a new question into Analytic contract. Example:<br/>
  `pnpm hardhat --network localhost analytics:newQuestion --type opt-1val`<br/>
  Check [the source](./tasks/analytics.ts) to see what types are supported.

- **analytics:answer**: answer a specify question in batch. Examaple:<br/>
  `pnpm hardhat --network localhost analytics:answer --type opt-1val --start 0 --num 10 0` - this loads 10 answers (`--num`) starting from index 0 (`--start`) to question with ID 0.

- **analytics:newQuery**: create a query request. Example:<br/>
  `pnpm hardhat --network localhost analytics:newQuery --type opt-1val --qr-type 0pred 0`

- **analytics:executeQuery**: execute a query request. Example:<br/>
  `pnpm hardhat --network localhost analytics:executeQuery --steps 5 0` - process a query request with 5 answers on query request with ID 0.

- **analytics:read**: read the onchain storage. Example:<br/>
  `pnpm hardhat --network localhost analytics:read getQuestion 0` - call the `getQuestion()` view function with parameter 0.
