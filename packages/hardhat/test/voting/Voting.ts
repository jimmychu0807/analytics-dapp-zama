import { expect } from "chai";
import hre from "hardhat";
import { getSigners, initSigners } from "../signers";
import { createInstance } from "../instance";
import { initGateway, awaitAllDecryptionResults } from "../asyncDecrypt";

describe("Voting", function() {
  before(async function() {
    await initSigners();
    this.signers = await getSigners();

    await initGateway();
  });

  beforeEach(async function() {
    const contractFactory = await hre.ethers.getContractFactory("Voting");
    this.votingContract = await contractFactory.connect(this.signers.alice).deploy();
    await this.votingContract.waitForDeployment();
    this.contractAddress = await this.votingContract.getAddress();
    this.fhevm = await createInstance();
  });

  it("should create a new proposal", async function() {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 10 // in 10 sec

    let tx = this.votingContract.connect(this.signers.alice).newProposal(
      "Contributor Voting",
      ["Alice", "Bob", "Carol"],
      10,
      5,
      currentTS,
      endTS
    );

    await expect(tx)
      .to.emit(this.votingContract, "ProposalCreated")
      .withArgs(this.signers.alice, 0, currentTS, endTS);

    // Test the storage and event emitted
    const proposalId = 0;
    const proposal = await this.votingContract.getProposal(proposalId);
    expect(proposal.options).to.deep.equal(["Alice", "Bob", "Carol"]);

    const nextProposalId = await this.votingContract.nextProposalId();
    expect(nextProposalId).to.equal(1);
  });

  it("should accept a vote", async function() {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 60 // end in 60 sec

    let tx = await this.votingContract.connect(this.signers.alice).newProposal(
      "Contributor Voting",
      ["Alice", "Bob", "Carol"],
      10,
      5,
      currentTS,
      endTS
    );
    await tx.wait();

    const proposalId = 0;

    // Bob votes
    const instance = await createInstance();
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();
    const encodedVote = encodeVote([5, 3, 2]);

    const input = instance.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add64(proposalId).add256(encodedVote).encrypt();

    tx = await this.votingContract.connect(this.signers.bob).vote(
      inputs.handles[0],
      inputs.handles[1],
      inputs.inputProof
    );

    await tx.wait();
    await awaitAllDecryptionResults();

    // assert the signer has voted
    const hasVoted = await this.votingContract.hasVoted(proposalId, signerAddr);
    expect(hasVoted).to.equal(true);

    const votesLen = await this.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(1);
  });

  it("invalid vote should not be accepted", async function() {
    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 60 // end in 60 sec

    let tx = await this.votingContract.connect(this.signers.alice).newProposal(
      "Contributor Voting",
      ["Alice", "Bob", "Carol"],
      10,
      5,
      currentTS,
      endTS
    );
    await tx.wait();

    const proposalId = 0;

    // Bob votes
    const instance = await createInstance();
    const signer = this.signers.bob;
    const signerAddr = await signer.getAddress();
    const encodedVote1 = encodeVote([5, 5, 5]);

    const input = instance.createEncryptedInput(this.contractAddress, signerAddr);
    const inputs = await input.add64(proposalId).add256(encodedVote1).encrypt();

    tx = await this.votingContract.connect(this.signers.bob).vote(
      inputs.handles[0],
      inputs.handles[1],
      inputs.inputProof
    );

    await tx.wait();
    await awaitAllDecryptionResults();

    // assert the signer has not voted
    let hasVoted = await this.votingContract.hasVoted(proposalId, signerAddr);
    expect(hasVoted).to.equal(false);

    let votesLen = await this.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(0);

    // -- Next encodedVote2 --
    const encodedVote2 = encodeVote([5, 5, 5, 5]);
    const inputs2 = await input.add64(proposalId).add256(encodedVote2).encrypt();

    tx = await this.votingContract.connect(this.signers.bob).vote(
      inputs2.handles[0],
      inputs2.handles[1],
      inputs2.inputProof
    );

    await tx.wait();
    await awaitAllDecryptionResults();

    // assert the signer has not voted
    hasVoted = await this.votingContract.hasVoted(proposalId, signerAddr);
    expect(hasVoted).to.equal(false);

    votesLen = await this.votingContract.getVotesLen(proposalId);
    expect(votesLen).to.equal(0);
  });
})

function encodeVote(votes: number[]): bigint {
  const expandedVotes = [...votes, ...Array(32 - votes.length).fill(0)];
  const voteBytes = hre.ethers.solidityPacked(
    [ 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8',
      'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8',
      'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8',
      'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8' ],
    expandedVotes
  );

  return BigInt(voteBytes);
}
