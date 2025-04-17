import { expect } from "chai";
import { Contract, TransactionReceipt, Log } from "ethers";
import hre from "hardhat";

import { initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { reencryptEuint64 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { getFHEGasFromTxReceipt } from "../coprocessorUtils";
import { AggregateOp, Continent, Gender, PredicateOp } from "./types";

describe("Voting", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    await initGateway();
  });

  function printGasConsumed(receipt: TransactionReceipt, prefix: string) {
    const gasConsumed = getFHEGasFromTxReceipt(receipt);
    console.log(`${prefix}: (Native gas, FHE gas) consumed: (${receipt.gasUsed}, ${gasConsumed})`);
  }

  function getEventArgs(contract: Contract, eventLogs: Log[], eventName: string) {
    const targetLogs = eventLogs
      .map((log) => contract.interface.parseLog(log))
      .filter(log => log && log.name === eventName);

    return targetLogs.length > 0 ? targetLogs[0]!.args : undefined;
  }

  async function loadProposalFixture(ctx: Mocha.Context) {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 1000;

    await ctx.votingContract
      .connect(ctx.signers.alice)
      .newProposal("How would you rate Alice?", ["Gender", "Continet", "Age"], 3, currentTS, endTS);
  }

  async function loadProposalAndVotesFixture(ctx: Mocha.Context, numEntries?: number) {
    await loadProposalFixture(ctx);

    const proposalId = 0;
    const voteData = [
      [ctx.signers.alice, 5, Gender.Female, Continent.Asia, 44],
      [ctx.signers.bob, 8, Gender.Male, Continent.Asia, 25],
      [ctx.signers.carol, 2, Gender.Female, Continent.Europe, 30],
      [ctx.signers.dave, 4, Gender.Male, Continent.Europe, 35],
      [ctx.signers.eve, 10, Gender.Female, Continent.Europe, 40],
      [ctx.signers.fred, 9, Gender.Male, Continent.Africa, 30],
    ];
    const instance = await createInstance();

    numEntries = numEntries ?? voteData.length;

    for (let idx = 0; idx < numEntries; idx++) {
      const oneVoteData = voteData[idx];

      const signer = oneVoteData[0];
      const signerAddr = await signer.getAddress();
      const input = instance.createEncryptedInput(ctx.contractAddress, signerAddr);
      const inputs = await input
        .add64(oneVoteData[1])
        .add64(oneVoteData[2])
        .add64(oneVoteData[3])
        .add64(oneVoteData[4])
        .encrypt();

      await ctx.votingContract
        .connect(oneVoteData[0])
        .castVote(
          proposalId,
          inputs.handles[0],
          inputs.handles[1],
          inputs.handles[2],
          inputs.handles[3],
          inputs.inputProof,
        );
    }

    const votesLen = await ctx.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(voteData.length);

    return { instance, proposalId, voteData };
  }

  beforeEach(async function () {
    const contractFactory = await hre.ethers.getContractFactory("Voting");
    this.votingContract = await contractFactory.connect(this.signers.alice).deploy();
    await this.votingContract.waitForDeployment();
    this.contractAddress = await this.votingContract.getAddress();
    this.fhevm = await createInstance();
  });

  it("should create a new proposal", async function () {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 1000; // in 1000 secs

    const tx = this.votingContract
      .connect(this.signers.alice)
      .newProposal("How would you rate Alice?", ["Gender", "Continet", "Age"], 5, currentTS, endTS);

    await expect(tx).to.emit(this.votingContract, "ProposalCreated").withArgs(this.signers.alice, 0, currentTS, endTS);

    // Test the storage and event emitted
    const proposalId = 0;
    const proposal = await this.votingContract.getProposal(proposalId);
    expect(proposal.metaOpts).to.deep.equal(["Gender", "Continet", "Age"]);

    const nextProposalId = await this.votingContract.nextProposalId();
    expect(nextProposalId).to.equal(1);
  });

  it("should accept a vote", async function () {
    await loadProposalFixture(this);

    // Bob votes
    const proposalId = 0;
    const instance = await createInstance();
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();

    const input = instance.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add64(5).add64(Gender.Male).add64(Continent.Asia).add64(44).encrypt();

    const tx = await this.votingContract
      .connect(this.signers.bob)
      .castVote(
        proposalId,
        inputs.handles[0],
        inputs.handles[1],
        inputs.handles[2],
        inputs.handles[3],
        inputs.inputProof,
      );

    printGasConsumed(await tx.wait(), "castVote");

    // assert the signer has voted
    const hasVoted = await this.votingContract.hasVoted(proposalId, signerAddr);
    expect(hasVoted).to.equal(true);

    const votesLen = await this.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(1);
  });

  it("able to query with no predicate in one round with SUM", async function () {
    const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);

    let tx = await this.votingContract
      .connect(this.signers.alice)
      .requestQuery(proposalId, AggregateOp.SUM, [], "0x");
    let receipt = await tx.wait();

    const [reqId] = getEventArgs(this.votingContract, receipt.logs, 'QueryRequestCreated')!;

    // Perform one round of query
    tx = await this.votingContract.executeQuery(reqId, voteData.length);
    receipt = await tx.wait();
    printGasConsumed(receipt, "executeQuery");

    const eventArgs = getEventArgs(this.votingContract, receipt.logs, 'QueryExecutionCompleted');
    expect(eventArgs).to.deep.equal([reqId]);

    const encryptedHandle = await this.votingContract.getQueryResult(reqId);
    const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);

    const sum = voteData.reduce((acc, oneVote) => acc + oneVote[1], 0);
    expect(queryResult).to.equal(sum);
  });

  it("able to query with one predicate in two rounds with SUM", async function () {
    const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
    const aliceAddr = await this.signers.alice.getAddress();
    const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
    const inputs = await input.add64(Gender.Male).encrypt();

    let tx = await this.votingContract
      .connect(this.signers.alice)
      .requestQuery(
        proposalId,
        AggregateOp.SUM,
        [{ metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] }],
        inputs.inputProof,
      );

    const reqId = BigInt(0);
    const steps = Math.ceil(voteData.length / 2);

    // Perform the 1st round of query
    tx = await this.votingContract.executeQuery(reqId, steps);
    let receipt = await tx.wait();
    printGasConsumed(receipt, "1st executeQuery");

    let eventArgs = getEventArgs(this.votingContract, receipt.logs, 'QueryExecutionRunning');
    expect(eventArgs).to.deep.equal([reqId, steps, voteData.length]);

    // Perform the 2nd around of query
    tx = await this.votingContract.executeQuery(reqId, steps);
    receipt = await tx.wait();
    printGasConsumed(receipt, "2nd executeQuery");

    eventArgs = getEventArgs(this.votingContract, receipt.logs, 'QueryExecutionCompleted');
    expect(eventArgs).to.deep.equal([reqId]);

    // Read the value back with reencryption
    const encryptedHandle = await this.votingContract.getQueryResult(reqId);
    const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
    const sum = voteData.filter((v) => v[2] === Gender.Male).reduce((acc, oneVote) => acc + oneVote[1], 0);
    expect(queryResult).to.equal(sum);
  });

  it("able to query with two predicates in two rounds with SUM", async function () {
    const { instance, proposalId, voteData } = await loadProposalAndVotesFixture(this);
    const aliceAddr = await this.signers.alice.getAddress();
    const input = instance.createEncryptedInput(this.contractAddress, aliceAddr);
    const inputs = await input.add64(Gender.Male).add64(29).encrypt();
    let tx = await this.votingContract
      .connect(this.signers.alice)
      .requestQuery(
        proposalId,
        AggregateOp.SUM,
        [ { metaOpt: 0, op: PredicateOp.EQ, handle: inputs.handles[0] },
          { metaOpt: 2, op: PredicateOp.GT, handle: inputs.handles[1] } ],
        inputs.inputProof,
    );

    const reqId = BigInt(0);
    const steps = Math.ceil(voteData.length / 2);

    // Perform the 1st round of query
    tx = await this.votingContract.executeQuery(reqId, steps);
    let receipt = await tx.wait();
    printGasConsumed(receipt, "1st executeQuery");

    let eventArgs = getEventArgs(this.votingContract, receipt.logs, 'QueryExecutionRunning');
    expect(eventArgs).to.deep.equal([reqId, steps, voteData.length]);

    // Perform the 2nd around of query
    tx = await this.votingContract.executeQuery(reqId, steps);
    receipt = await tx.wait();
    printGasConsumed(receipt, "2nd executeQuery");

    eventArgs = getEventArgs(this.votingContract, receipt.logs, 'QueryExecutionCompleted');
    expect(eventArgs).to.deep.equal([reqId]);

    // Read the value back with reencryption
    const encryptedHandle = await this.votingContract.getQueryResult(reqId);
    const queryResult = await reencryptEuint64(this.signers.alice, instance, encryptedHandle, this.contractAddress);
    const sum = voteData.filter((v) => v[2] === Gender.Male && v[4] > 29).reduce((acc, oneVote) => acc + oneVote[1], 0);
    expect(queryResult).to.equal(sum);
  });
});
