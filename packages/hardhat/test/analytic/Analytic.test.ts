import { expect } from "chai";
import { Contract, Log, TransactionReceipt } from "ethers";
import hre from "hardhat";

import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { getFHEGasFromTxReceipt } from "../coprocessorUtils";
import { createInstance } from "../instance";
import { reencryptEuint32 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { countAnswerData } from "./fixtures";
import { AggregateOp } from "./types";

describe("Analytic", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    await initGateway();
  });

  function printGasConsumed(receipt: TransactionReceipt, prefix: string) {
    const gasConsumed = getFHEGasFromTxReceipt(receipt);
    console.log(`${prefix}: Native & FHE gas consumed: (${receipt.gasUsed}, ${gasConsumed})`);
  }

  function testEventArgs(contract: Contract, eventLogs: Log[], eventName: string, args?: unknown) {
    const targetLogs = eventLogs
      .map((log) => contract.interface.parseLog(log))
      .filter((log) => log && log.name === eventName);

    // test such event exists
    expect(targetLogs.length).to.be.above(0);

    if (targetLogs.length > 0 && args !== undefined) {
      const logArgs = targetLogs[0]!.args;
      expect(logArgs).to.deep.equal(args);
    }
  }

  async function loadCountQuestionFixture(ctx: Mocha.Context) {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 1000; // in 1000 secs

    const metaOpts = [
      { text: "Your current asset worth", min: 0, max: 3 },
      { text: "Your age", min: 18, max: 150 },
    ];
    await ctx.analyticContract
      .connect(ctx.signers.alice)
      .newQuestion("Which L2 chains do you use most?", metaOpts, AggregateOp.COUNT, 0, 4, currentTS, endTS, 3);
  }

  async function loadCountQuestionAndAnsFixture(ctx: Mocha.Context, numEntries: number = 20) {
    if (numEntries > 50) throw new Error("exceeded max entries");

    await loadCountQuestionFixture(ctx);

    const qId = 0;
    const signers = await hre.ethers.getSigners();
    const signerAddrs = await Promise.all(signers.map((s) => s.getAddress()));

    for (let idx = 0; idx < numEntries; idx++) {
      const ans = countAnswerData[idx];
      const signer = signers[idx];
      const signerAddr = signerAddrs[idx];
      const input = ctx.fhevm.createEncryptedInput(ctx.contractAddress, signerAddr);
      const inputs = await input.add32(ans[0]).add16(ans[1]).add16(ans[2]).encrypt();

      await ctx.analyticContract
        .connect(signer)
        .answer(qId, inputs.handles[0], inputs.handles.slice(1), inputs.inputProof);
    }
    await awaitAllDecryptionResults();

    const ansLen = await ctx.analyticContract.getAnsLen(qId);
    expect(ansLen).to.equal(numEntries);

    return { qId, ansData: countAnswerData.slice(0, numEntries) };
  }

  beforeEach(async function () {
    const contractFactory = await hre.ethers.getContractFactory("Analytic");
    this.analyticContract = await contractFactory.connect(this.signers.alice).deploy();
    await this.analyticContract.waitForDeployment();
    this.contractAddress = await this.analyticContract.getAddress();
    this.fhevm = await createInstance();
  });

  it("should create a new question", async function () {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 1000; // in 1000 secs

    const metaOpts = [
      { text: "Your current asset worth", min: 0, max: 3 },
      { text: "Your age", min: 18, max: 150 },
    ];
    const tx = this.analyticContract
      .connect(this.signers.alice)
      .newQuestion("Which L2 chains do you use most?", metaOpts, AggregateOp.COUNT, 0, 4, currentTS, endTS, 3);

    await expect(tx).emit(this.analyticContract, "QuestionCreated").withArgs(this.signers.alice, 0, currentTS, endTS);

    // Test the storage
    const qId = 0;
    const question = await this.analyticContract.getQuestion(qId);
    expect(question.metaOpts).to.deep.equal(metaOpts.map((opt) => Object.values(opt)));

    const nextQuestionId = await this.analyticContract.nextQuestionId();
    expect(nextQuestionId).to.equal(1);
  });

  it("should accept a valid answer", async function () {
    await loadCountQuestionFixture(this);

    // Bob votes
    const qId = 0;
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();

    // Setup event listener before sending tx
    const eventPromise = new Promise((resolve) => {
      this.analyticContract.once("ConfirmAnswer", (qId: bigint, sender: string) => {
        resolve({ qId, sender });
      });
    });

    const input = this.fhevm.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add32(0).add16(2).add16(41).encrypt();
    const tx = await this.analyticContract
      .connect(this.signers.bob)
      .answer(qId, inputs.handles[0], inputs.handles.slice(1), inputs.inputProof);

    printGasConsumed(await tx.wait(), "answer");
    await awaitAllDecryptionResults();

    // check the specific event is emitted
    const eventArgs = await Promise.race([
      eventPromise,
      new Promise((_, reject) => setTimeout(() => reject("event not detected"), 3000)),
    ]);
    expect(eventArgs).to.deep.equal({ qId, sender: signerAddr });

    // check the storage
    const hasAnswered = await this.analyticContract.hasAnswered(qId, signerAddr);
    expect(hasAnswered).to.equal(true);

    const ansLen = await this.analyticContract.getAnsLen(qId);
    expect(ansLen).to.equal(1);
  });

  it("should not accept invalid answer", async function () {
    await loadCountQuestionFixture(this);

    // Bob votes
    const qId = 0;
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();

    const input = this.fhevm.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add32(0).add16(4).add16(41).encrypt();
    const tx = await this.analyticContract
      .connect(this.signers.bob)
      .answer(qId, inputs.handles[0], inputs.handles.slice(1), inputs.inputProof);

    printGasConsumed(await tx.wait(), "answer");
    await awaitAllDecryptionResults();

    // TODO: how to check an error is thrown on awaitAllDecryptionResults()?

    // check the storage, no new answer should have added
    const hasAnswered = await this.analyticContract.hasAnswered(qId, signerAddr);
    expect(hasAnswered).to.equal(false);

    const ansLen = await this.analyticContract.getAnsLen(qId);
    expect(ansLen).to.equal(0);
  });

  it("able to query COUNT type question with no predicate in one step", async function () {
    const { qId, ansData } = await loadCountQuestionAndAnsFixture(this, 7);

    const aliceAddr = await this.signers.alice.getAddress();
    // prettier-ignore
    let tx = await this.analyticContract
      .connect(this.signers.alice)
      .requestQuery(qId, [], "0x");
    let receipt = await tx.wait();

    testEventArgs(this.analyticContract, receipt.logs, "QueryRequestCreated", [0, aliceAddr]);

    // Perform one round of query
    const reqId = 0;
    tx = await this.analyticContract.executeQuery(reqId, ansData.length);
    receipt = await tx.wait();
    printGasConsumed(receipt, "executeQuery");

    testEventArgs(this.analyticContract, receipt.logs, "QueryExecutionCompleted", [reqId]);

    const handles: bigint[] = await this.analyticContract.getQueryResult(reqId);
    const decryptedRes = await Promise.all(
      handles.map((h) => reencryptEuint32(this.signers.alice, this.fhevm, h, this.contractAddress)),
    );

    const bucketSize = 5;
    const bucketCnt = ansData.reduce((acc, ans) => {
      acc[ans[0]] += 1;
      return acc;
    }, new Array(bucketSize).fill(0));
    expect(decryptedRes).to.deep.equal(bucketCnt);
  });

  it.only("able to query COUNT type question with no predicate in multiple steps", async function () {
    const { qId, ansData } = await loadCountQuestionAndAnsFixture(this);

    // prettier-ignore
    await this.analyticContract
      .connect(this.signers.alice)
      .requestQuery(qId, [], "0x");

    const reqId = 0;
    // Executing the query in three steps. Currently the steps to take is manually configured
    const steps = 6;
    const iterations = Math.floor(ansData.length / steps) + (ansData.length % steps === 0 ? 0 : 1);
    let accSteps = 0;

    // Perform the multiple round of executeQuery
    for (let i = 0; i < iterations; i++) {
      const tx = await this.analyticContract.executeQuery(reqId, steps);
      const receipt = await tx.wait();
      accSteps += steps;

      // print gas usage
      printGasConsumed(receipt, `executeQuery-${i}`);
      if (i !== iterations - 1) {
        testEventArgs(this.analyticContract, receipt.logs, "QueryExecutionRunning", [reqId, accSteps, ansData.length]);
      } else {
        testEventArgs(this.analyticContract, receipt.logs, "QueryExecutionCompleted", [reqId]);
      }
    }

    // Read the value back with reencryption
    const handles: bigint[] = await this.analyticContract.getQueryResult(reqId);
    const decryptedRes = await Promise.all(
      handles.map((h) => reencryptEuint32(this.signers.alice, this.fhevm, h, this.contractAddress)),
    );

    const bucketSize = 5;
    const bucketCnt = ansData.reduce((acc, ans) => {
      acc[ans[0]] += 1;
      return acc;
    }, new Array(bucketSize).fill(0));
    expect(decryptedRes).to.deep.equal(bucketCnt);
  });

  // it("able to query with one predicate in two rounds with COUNT", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
  //   const aliceAddr = await this.signers.alice.getAddress();
  //   const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
  //   const inputs = await input.add64(Gender.Male).encrypt();

  //   let tx = await this.votingContract
  //     .connect(this.signers.alice)
  //     .requestQuery(
  //       proposalId,
  //       AggregateOp.COUNT,
  //       [{ metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] }],
  //       inputs.inputProof,
  //     );

  //   const reqId = BigInt(0);
  //   const steps = Math.ceil(voteData.length / 2);

  //   // Perform the 1st round of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   printGasConsumed(await tx.wait(), "1st executeQuery");

  //   // Perform the 2nd around of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   const receipt = await tx.wait();
  //   printGasConsumed(receipt, "2nd executeQuery");
  //   const eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionCompleted");
  //   expect(eventArgs).to.deep.equal([reqId]);

  //   // Read the value back with reencryption
  //   const encryptedHandle = await this.votingContract.getQueryResult(reqId);
  //   const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
  //   const sum = voteData.filter((v) => v[2] === Gender.Male).reduce((acc, oneVote) => acc + 1, 0);
  //   expect(queryResult).to.equal(sum);
  // });

  // it.only("able to query with one predicate in two rounds with MAX", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
  //   const aliceAddr = await this.signers.alice.getAddress();
  //   const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
  //   const inputs = await input.add64(Gender.Male).encrypt();

  //   let tx = await this.votingContract
  //     .connect(this.signers.alice)
  //     .requestQuery(
  //       proposalId,
  //       AggregateOp.MAX,
  //       [{ metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] }],
  //       inputs.inputProof,
  //     );

  //   const reqId = BigInt(0);
  //   const steps = Math.ceil(voteData.length / 2);

  //   // Perform the 1st round of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   printGasConsumed(await tx.wait(), "1st executeQuery");

  //   // Perform the 2nd around of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   const receipt = await tx.wait();
  //   printGasConsumed(receipt, "2nd executeQuery");
  //   const eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionCompleted");
  //   expect(eventArgs).to.deep.equal([reqId]);

  //   // Read the value back with reencryption
  //   const encryptedHandle = await this.votingContract.getQueryResult(reqId);
  //   const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
  //   const max = voteData.filter((v) => v[2] === Gender.Male).reduce((acc, oneVote) => acc > oneVote[1] ? acc : oneVote[1], 0);
  //   expect(queryResult).to.equal(max);
  // });

  // it.only("able to query with one predicate in two rounds with MIN", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
  //   const aliceAddr = await this.signers.alice.getAddress();
  //   const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
  //   const inputs = await input.add64(Gender.Male).encrypt();

  //   let tx = await this.votingContract
  //     .connect(this.signers.alice)
  //     .requestQuery(
  //       proposalId,
  //       AggregateOp.MIN,
  //       [{ metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] }],
  //       inputs.inputProof,
  //     );

  //   const reqId = BigInt(0);
  //   const steps = Math.ceil(voteData.length / 2);

  //   // Perform the 1st round of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   printGasConsumed(await tx.wait(), "1st executeQuery");

  //   // Perform the 2nd around of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   const receipt = await tx.wait();
  //   printGasConsumed(receipt, "2nd executeQuery");
  //   const eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionCompleted");
  //   expect(eventArgs).to.deep.equal([reqId]);

  //   // Read the value back with reencryption
  //   const encryptedHandle = await this.votingContract.getQueryResult(reqId);
  //   const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
  //   const max = voteData.filter((v) => v[2] === Gender.Male).reduce((acc, oneVote) => acc > oneVote[1] ? acc : oneVote[1], 0);
  //   expect(queryResult).to.equal(max);
  // });

  // it("able to query with two predicates in two rounds with SUM", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
  //   const aliceAddr = await this.signers.alice.getAddress();
  //   const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
  //   const inputs = await input.add64(Gender.Male).add64(29).encrypt();
  //   let tx = await this.votingContract.connect(this.signers.alice).requestQuery(
  //     proposalId,
  //     AggregateOp.SUM,
  //     [
  //       { metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] },
  //       { metaOpt: 2, op: PredicateOp.GT, handle: inputs.handles[1] },
  //     ],
  //     inputs.inputProof,
  //   );

  //   const reqId = BigInt(0);
  //   const steps = Math.ceil(voteData.length / 2);

  //   // Perform the 1st round of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   let receipt = await tx.wait();
  //   printGasConsumed(receipt, "1st executeQuery");

  //   let eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionRunning");
  //   expect(eventArgs).to.deep.equal([reqId, steps, voteData.length]);

  //   // Perform the 2nd around of query
  //   tx = await this.votingContract.executeQuery(reqId, steps);
  //   receipt = await tx.wait();
  //   printGasConsumed(receipt, "2nd executeQuery");

  //   eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionCompleted");
  //   expect(eventArgs).to.deep.equal([reqId]);

  //   // Read the value back with reencryption
  //   const encryptedHandle = await this.votingContract.getQueryResult(reqId);
  //   const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
  //   const sum = voteData.filter((v) => v[2] === Gender.Male && v[4] > 29).reduce((acc, oneVote) => acc + oneVote[1], 0);
  //   expect(queryResult).to.equal(sum);
  // });
});
