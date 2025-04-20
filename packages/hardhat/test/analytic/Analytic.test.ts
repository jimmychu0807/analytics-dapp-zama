import { expect } from "chai";
import { TransactionReceipt } from "ethers";
import hre from "hardhat";

import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { getFHEGasFromTxReceipt } from "../coprocessorUtils";
import { createInstance } from "../instance";
// import { reencryptEuint64 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
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

  // function getEventArgs(contract: Contract, eventLogs: Log[], eventName: string) {
  //   const targetLogs = eventLogs
  //     .map((log) => contract.interface.parseLog(log))
  //     .filter((log) => log && log.name === eventName);

  //   return targetLogs.length > 0 ? targetLogs[0]!.args : undefined;
  // }

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

  // async function loadProposalAndVotesFixture(ctx: Mocha.Context, numEntries?: number) {
  //   await loadProposalFixture(ctx);

  //   const proposalId = 0;
  //   const voteData = [
  //     [ctx.signers.alice, 5, Gender.Female, Continent.Asia, 44],
  //     [ctx.signers.bob, 8, Gender.Male, Continent.Asia, 25],
  //     [ctx.signers.carol, 2, Gender.Female, Continent.Europe, 30],
  //     [ctx.signers.dave, 4, Gender.Male, Continent.Europe, 35],
  //     [ctx.signers.eve, 10, Gender.Female, Continent.Europe, 40],
  //     [ctx.signers.fred, 9, Gender.Male, Continent.Africa, 30],
  //   ];
  //   const instance = await createInstance();

  //   numEntries = numEntries ?? voteData.length;

  //   for (let idx = 0; idx < numEntries; idx++) {
  //     const oneVoteData = voteData[idx];

  //     const signer = oneVoteData[0];
  //     const signerAddr = await signer.getAddress();
  //     const input = instance.createEncryptedInput(ctx.contractAddress, signerAddr);
  //     const inputs = await input
  //       .add64(oneVoteData[1])
  //       .add64(oneVoteData[2])
  //       .add64(oneVoteData[3])
  //       .add64(oneVoteData[4])
  //       .encrypt();

  //     await ctx.votingContract
  //       .connect(oneVoteData[0])
  //       .castVote(
  //         proposalId,
  //         inputs.handles[0],
  //         inputs.handles[1],
  //         inputs.handles[2],
  //         inputs.handles[3],
  //         inputs.inputProof,
  //       );
  //   }

  //   const votesLen = await ctx.votingContract.getVotesLen(proposalId);
  //   expect(votesLen).to.equal(voteData.length);

  //   return { instance, proposalId, voteData };
  // }

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

    const input = this.fhevm.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add64(0).add16(2).add16(41).encrypt();

    // Setup event listener before sending tx
    const eventPromise = new Promise((resolve) => {
      this.analyticContract.once("ConfirmAnswer", (qId: bigint, sender: string) => {
        resolve({ qId, sender });
      });
    });

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

  // it("able to query with no predicate in one round with SUM", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);

  //   // prettier-ignore
  //   let tx = await this.votingContract
  //     .connect(this.signers.alice)
  //     .requestQuery(proposalId, AggregateOp.SUM, [], "0x");
  //   let receipt = await tx.wait();

  //   const [reqId] = getEventArgs(this.votingContract, receipt.logs, "QueryRequestCreated")!;

  //   // Perform one round of query
  //   tx = await this.votingContract.executeQuery(reqId, voteData.length);
  //   receipt = await tx.wait();
  //   printGasConsumed(receipt, "executeQuery");

  //   const eventArgs = getEventArgs(this.votingContract, receipt.logs, "QueryExecutionCompleted");
  //   expect(eventArgs).to.deep.equal([reqId]);

  //   const encryptedHandle = await this.votingContract.getQueryResult(reqId);
  //   const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);

  //   const sum = voteData.reduce((acc, oneVote) => acc + oneVote[1], 0);
  //   expect(queryResult).to.equal(sum);
  // });

  // it("able to query with one predicate in two rounds with SUM", async function () {
  //   const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
  //   const aliceAddr = await this.signers.alice.getAddress();
  //   const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
  //   const inputs = await input.add64(Gender.Male).encrypt();

  //   let tx = await this.votingContract
  //     .connect(this.signers.alice)
  //     .requestQuery(
  //       proposalId,
  //       AggregateOp.SUM,
  //       [{ metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] }],
  //       inputs.inputProof,
  //     );

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
  //   const sum = voteData.filter((v) => v[2] === Gender.Male).reduce((acc, oneVote) => acc + oneVote[1], 0);
  //   expect(queryResult).to.equal(sum);
  // });

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
