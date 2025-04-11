import { expect } from "chai";
import hre from "hardhat";
import { getSigners, initSigners } from "../signers";


describe("Voting", function() {
  before(async function() {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function() {
    const contractFactory = await hre.ethers.getContractFactory("Voting");
    this.votingContract = await contractFactory.connect(this.signers.alice).deploy();
    await this.votingContract.waitForDeployment();
  });

  it("should create a new proposal", async function() {
    const currentTS = Date.now();
    const endTS = currentTS + 10000 // in 10 sec

    let tx = this.votingContract.connect(this.signers.alice).newProposal(
      "Contributor Voting",
      ["Ah Carl", "Daisy", "Jimmy"],
      10,
      5,
      currentTS,
      endTS
    );

    await expect(tx)
      .to.emit(this.votingContract, "ProposalCreated")
      .withArgs(this.signers.alice, 0, currentTS, endTS);

    // Test the storage and event emitted
    const proposal = await this.votingContract.getProposal(0);
    expect(proposal.options).to.deep.equal(["Ah Carl", "Daisy", "Jimmy"]);

    const nextProposalId = await this.votingContract.nextProposalId();
    expect(nextProposalId).to.equal(1);
  });

})
