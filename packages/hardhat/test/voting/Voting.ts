import { expect } from "chai";
import hre from "hardhat";
import { getSigners, initSigners } from "../signers";
import { createInstance } from "../instance";
import { initGateway, awaitAllDecryptionResults } from "../asyncDecrypt";
import { Gender, Continent } from "./meta";

describe("Voting", function() {
  before(async function() {
    await initSigners();
    this.signers = await getSigners();

    await initGateway();
  });

  async function loadProposalAndVotesFixture(ctx: Mocha.Context) {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 100 // in 30 sec

    await ctx.votingContract.connect(ctx.signers.alice).newProposal(
      "How would you rate alice?",
      ["Gender", "Continet", "Age"],
      5,
      currentTS,
      endTS,
    );

    // Bob votes
    const proposalId = 0;

    const voteData = [
      [ctx.signers.alice, 5, Gender.Male, Continent.Asia, 44],
      [ctx.signers.bob, 8, Gender.Male, Continent.Asia, 25],
      [ctx.signers.carol, 2, Gender.Female, Continent.Europe, 30],
      [ctx.signers.dave, 4, Gender.Female, Continent.Europe, 35],
      [ctx.signers.eve, 10, Gender.Female, Continent.Europe, 40],
    ];
    const instance = await createInstance();

    for (const oneVoteData of voteData) {
      const signer = oneVoteData[0];
      const signerAddr = await signer.getAddress();
      const input = instance.createEncryptedInput(ctx.contractAddress, signerAddr);
      const inputs = await input
        .add64(oneVoteData[1])
        .add64(oneVoteData[2])
        .add64(oneVoteData[3])
        .add64(oneVoteData[4])
        .encrypt();

      await ctx.votingContract.connect(oneVoteData[0]).castVote(
        proposalId,
        inputs.handles[0],
        inputs.handles[1],
        inputs.handles[2],
        inputs.handles[3],
        inputs.inputProof
      );
    }

    const votesLen = await ctx.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(voteData.length);

    return { voteData };
  }

  beforeEach(async function() {
    const contractFactory = await hre.ethers.getContractFactory("Voting");
    this.votingContract = await contractFactory.connect(this.signers.alice).deploy();
    await this.votingContract.waitForDeployment();
    this.contractAddress = await this.votingContract.getAddress();
    this.fhevm = await createInstance();
  });

  it("should create a new proposal", async function() {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 100 // in 30 sec

    let tx = this.votingContract.connect(this.signers.alice).newProposal(
      "How would you rate alice?",
      ["Gender", "Continet", "Age"],
      5,
      currentTS,
      endTS,
    );

    await expect(tx)
      .to.emit(this.votingContract, "ProposalCreated")
      .withArgs(this.signers.alice, 0, currentTS, endTS);

    // Test the storage and event emitted
    const proposalId = 0;
    const proposal = await this.votingContract.getProposal(proposalId);
    expect(proposal.metaOpts).to.deep.equal(["Gender", "Continet", "Age"]);

    const nextProposalId = await this.votingContract.nextProposalId();
    expect(nextProposalId).to.equal(1);
  });

  it("should accept a vote", async function() {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 100 // end in 30 sec

    let tx = await this.votingContract.connect(this.signers.alice).newProposal(
      "How would you rate alice?",
      ["Gender", "Continent", "Age"],
      5,
      currentTS,
      endTS,
    );

    // Bob votes
    const proposalId = 0;
    const instance = await createInstance();
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();

    const input = instance.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input
      .add64(5)
      .add64(Gender.Male)
      .add64(Continent.Asia)
      .add64(44)
      .encrypt();

    tx = await this.votingContract.connect(this.signers.bob).castVote(
      proposalId,
      inputs.handles[0],
      inputs.handles[1],
      inputs.handles[2],
      inputs.handles[3],
      inputs.inputProof
    );

    await tx.wait();
    // assert the signer has voted
    const hasVoted = await this.votingContract.hasVoted(proposalId, signerAddr);
    expect(hasVoted).to.equal(true);

    const votesLen = await this.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(1);
  });

  it("able to tally up", async function() {
    const { voteData } = await loadProposalAndVotesFixture(this);
  });
});
