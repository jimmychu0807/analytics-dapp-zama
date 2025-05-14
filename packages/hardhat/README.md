# Analytics dApp built on Zama fhEVM - hardhat

This package contains the smart contracts for the Analytics dApp, primarily:

- [contracts/Analytic.sol](./contracts/Analytic.sol)
- [contracts/QuestionSpecLib.sol](./contracts/QuestionSpecLib.sol)
- [interfaces/IAnalytic.sol](./interfaces/IAnalytic.sol)

## Setup

To run locally, start both the Hardhat node and a mocked fhEVM server, which handles encryption/decryption and listens for on-chain events from the Gateway contract.

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

Note: The Gateway contract deployed on the Hardhat node may stop emitting events after about 5–10 minutes. If this happens, restart both components. For troubleshooting, it is recommended to run the two components separately and monitor the mock-server output.

## Development Approach

### Key Storage

- `questions`: Stores user question sets. A [**Question**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L32) object consists of one **main** question and up to four **meta** questions. Each question can be either an `option` type (where the answer is one of the options) or a `value` type (where the answer must be within a specified min and max range).

  Each question set also contains start and end times for when it is open to new answers, and a `queryThreshold`, the minimum number of answers required before a query can be issued by an admin.

- `questionAnswers`: Stores answer sets received for each question set. An [**Answer**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L63) object contains encrypted values corresponding to the question set, so there are multiple values in a single answer set. Currently, we use the `euint32` data type for all encrypted values to balance the possible data range (the higher, the better) and fhEVM gas usage (the lower, the better).

- `queryRequests`: A mapping of [**QueryRequest**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L41) objects. Each contains the corresponding question ID, owner, and predicates for a query. `acc` stores the accumulated result from execution so far. `accSteps` is the number of answers processed so far (starting from 0 up to the total number of answers for the question set.) `ansCount` is the number of answers that match the predicates and included in the query result.

### Algorithm

Several notable techniques for FHE programming are used in the smart contracts. Inside [`Analytic.sol`](./contracts/Analytic.sol):

1. The `answer()` function accepts an encrypted answer set (answers to the main and meta questions) along with an input proof. Answers are encrypted on the client side, so clear text is never transmitted over the internet. The function checks that all values are within their valid bounds, and only requests decryption of a boolean flag in `confirmOrRejectAnswer()`. This approach preserves respondent privacy.

2. A `queryThreshold` value is set for each [Question](https://github.com/jimmychu0807/analytics-dapp-zama/blob/106f29d91a53fb9b3bd57ce32f570c1b24c1cd02/packages/hardhat/contracts/interfaces/IAnalytic.sol#L38) object. Admins can only issue queries for question sets with a number of answers above this threshold. This value should be set appropriately to protect respondent privacy.

3. The `executeQuery()` function processes answer sets one by one. It first checks whether each answer satisfies the predicates specified in the query, then aggregates the result using either `_aggregateCountAns()` (if the main question type is `Option`) or `_aggregateStatsAns()` (if the main question type is `Value`).

## Hardhat Tasks

After completing the [Setup](#setup), several [Hardhat tasks](./tasks/analytics.ts) are available to help test and set up sample data on the smart contracts. Add `--help` to tasks below to see the required parameters.

- **analytics:newQuestion**: Load a new question into the Analytic contract.<br/>
  Example:<br/>
  `pnpm hardhat --network localhost analytics:newQuestion --type opt-1val`<br/>
  Check [the source](./tasks/analytics.ts) to see what types are supported.

- **analytics:answer**: Answer a specific question in batch.<br/>
  Examaple:<br/>
  `pnpm hardhat --network localhost analytics:answer --type opt-1val --start 0 --num 10 0` - this loads 10 answers (`--num`) starting from index 0 (`--start`) to question with ID 0.

- **analytics:newQuery**: Create a query request.<br/>
  Example:<br/>
  `pnpm hardhat --network localhost analytics:newQuery --type opt-1val --qr-type 0pred 0`

- **analytics:executeQuery**: Execute a query request.<br/>
  Example:<br/>
  `pnpm hardhat --network localhost analytics:executeQuery --steps 5 0` - process a query request with 5 answers at a time for the query request with ID 0.

- **analytics:read**: Read the onchain storage.<br/>
  Example:<br/>
  `pnpm hardhat --network localhost analytics:read getQuestion 0` - call the `getQuestion()` view function with parameter 0.
