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

### Key Storage

- `questions`: It is where user question sets are stored. A [**Question**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L32) object consists of one **main** question and up to four **meta** questions. Each question can be either `option` type, that answer can be one of the options, or `value` type, that answer to be within a specified min and max range.

  It also contains the start and end time information when the question set is open to accept new answers, and the minimum answers needed for a question admin to issue a query request, `queryThreshold`.

- `questionAnswers`: It contains answer sets received for question sets. An [**Answer**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L63) object is a set of encrypted values corresponding to the question set, so there are multiple values in a single answer set. Currently we use `euint32` data type for all encrypted values to balance between possible range of data value (the higher the better) and fhEVM gas usage (the less the better).

- `queryRequests`: A mapping of [**QueryRequest**](https://github.com/jimmychu0807/analytics-dapp-zama/blob/dce793fa6c513b4d05dd182ecf95752ba178269b/packages/hardhat/contracts/interfaces/IAnalytic.sol#L41) objects. It contains the corresponding question ID, owner, and predicates of a query. `acc` stores the accumulated result so far from execution. `accSteps` are number of answers that have been processed so far. This number starts from 0 and will reach the total number of answers of the question set. `ansCount` are number of answers that match the predicates and being included.

### Algorithm

A few notable technique on FHE programming are used on the smart contract side. Inside [`Analytic.sol`](./contracts/Analytic.sol):

1. In `answer()` function, it accepts encrypted answer set (the answers to the main question and meta questions) with an input proof. The answer is encrypted on the client side so its clear text is never transmitted over the internet. The function check all values are within their valid bounds, and finally only request to decrypt this boolean flag in `confirmOrRejectAnswer()`. In this way, respondent privacy is honored.

2. A `queryThreshold` value is set for a [Question](https://github.com/jimmychu0807/analytics-dapp-zama/blob/106f29d91a53fb9b3bd57ce32f570c1b24c1cd02/packages/hardhat/contracts/interfaces/IAnalytic.sol#L38) object. Admin could only issue query to question sets with number of answers above this threshold. This value should be set to a reasonable level so respondent privacy is protected.

3. In `executeQuery()` function, it steps through the answer sets one by one. First it checks the answer satisfy the predicates specified in the query, and then aggregate the result by either `_aggregateCountAns()` if the main question type is `Option`, or `_aggregateStatsAns()` if the main question type is `Value`.

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
