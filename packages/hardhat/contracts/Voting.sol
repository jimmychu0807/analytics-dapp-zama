// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import {SepoliaZamaFHEVMConfig} from "fhevm/config/ZamaFHEVMConfig.sol";
import {SepoliaZamaGatewayConfig} from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import {console} from "hardhat/console.sol";

struct Proposal {
    address admin;
    string question;
    string[] options;
    uint16 userVotePoints;
    uint16 maxOptionPoints;
    uint256 startTime;
    uint256 endTime;
}

struct TallyResult {
    uint32[] optCount;
    bool counted;
}

contract Voting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    // --- constant ---
    uint16 public constant MAX_QUESTION_LEN = 512;
    uint16 public constant MAX_VOTE_PTS = 255;
    uint16 public constant MAX_OPTIONS = 32;

    // --- event ---
    event ProposalCreated(address indexed sender, uint64 indexed proposalId, uint256 startTime, uint256 endTime);
    event Voted(address indexed sender, uint64 indexed proposalId);

    // --- storage ---
    address public admin;
    uint64 public nextProposalId = 0;
    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => euint256[]) public votes;
    mapping(uint64 => mapping(address => bool)) public hasVoted;
    mapping(uint64 => TallyResult) public tallyResults;

    // --- viewer ---
    function getProposal(uint64 proposalId) public view returns (Proposal memory proposal) {
        require(proposalId < nextProposalId, "Invalid proposalId");
        proposal = proposals[proposalId];
    }

    function getVotesLen(uint64 proposalId) public view returns(uint256 voteLen) {
        require(proposalId < nextProposalId, "Invalid proposalId");
        euint256[] memory proposalVotes = votes[proposalId];
        voteLen = proposalVotes.length;
    }

    // --- write function ---

    function newProposal(
        string calldata _question,
        string[] calldata _options,
        uint16 _userVotePoints,
        uint16 _maxOptionPoints,
        uint256 _startTime,
        uint256 _endTime
    ) public returns (Proposal memory proposal) {
        require (bytes(_question).length <= MAX_QUESTION_LEN, "Question exceed 512 bytes");
        require(_options.length <= MAX_OPTIONS, "Options exceed 32 options");
        require(_userVotePoints <= MAX_VOTE_PTS, "User vote points exceed 1000");
        require(_maxOptionPoints <= MAX_VOTE_PTS, "Option max vote points exceed 1000");
        require(_startTime < _endTime, "Start time is gte to end time");

        proposal = Proposal({
            admin: msg.sender,
            question: _question,
            options: _options,
            userVotePoints: _userVotePoints,
            maxOptionPoints: _maxOptionPoints,
            startTime: _startTime,
            endTime: _endTime
        });

        uint64 proposalId = nextProposalId;
        proposals[proposalId] = proposal;
        nextProposalId += 1;

        emit ProposalCreated(msg.sender, proposalId, _startTime, _endTime);
    }

    function vote(
        einput eInProposalId,
        einput eInVotes,
        bytes calldata inputProof
    ) public {
        // check proposal exist
        euint64 encProposalId = TFHE.asEuint64(eInProposalId, inputProof);
        euint256 encVotes = TFHE.asEuint256(eInVotes, inputProof);

        uint256[] memory cts = new uint256[](2);
        cts[0] = Gateway.toUint256(encProposalId);
        cts[1] = Gateway.toUint256(encVotes);
        uint256 reqId = Gateway.requestDecryption(cts, this.voteCB.selector, 0, block.timestamp + 100, false);
        addParamsAddress(reqId, msg.sender);
    }

    function voteCB(uint256 reqId, uint64 proposalId, uint256 decVotes)
        onlyGateway
        public
    {
        // console.log("callback: {reqId: %s, proposalId: %s, votes: %s}", reqId, proposalId, decVotes);
        // Perform necessary check
        address sender = getParamsAddress(reqId)[0];
        // Proposal storage proposal = proposals[proposalId];

        require(proposalId < nextProposalId, "Invalid ProposalId.");
        require(!hasVoted[proposalId][sender], "Sender has voted already.");

        Proposal storage proposal = proposals[proposalId];
        uint256 currentTS = block.timestamp;

        require(currentTS >= proposal.startTime, "The voting hasn't started yet.");
        require(currentTS <= proposal.endTime, "The voting has ended already.");

        // NX> check the vote bytes inside
        bytes memory voteBytes = abi.encodePacked(bytes32(decVotes));
        uint16 accVotePts = 0;
        uint16 optLen = uint16(proposal.options.length);
        for(uint8 idx = 0; idx < 32; idx++) {
            uint8 val = uint8(voteBytes[idx]);

            if (idx < optLen) {
                require(val <= proposal.maxOptionPoints, "Exceed max option points.");
                accVotePts += val;
                require(accVotePts <= proposal.userVotePoints, "User vote points exceeded.");
            } else {
                require(val == 0, "Vote points allocated beyond options allowed.");
            }
        }

        euint256 encVote = TFHE.asEuint256(decVotes);
        TFHE.allowThis(encVote);

        votes[proposalId].push(encVote);
        hasVoted[proposalId][sender] = true;

        emit Voted(sender, proposalId);
    }

    function tallyUp(uint64 proposalId) public view returns (uint32[] memory) {
        require(proposalId < nextProposalId, "Invalid ProposalId.");
        Proposal storage proposal = proposals[proposalId];

        require (block.timestamp > proposal.endTime, "The vote has not ended yet.");

        TallyResult storage result = tallyResults[proposalId];
        if (result.counted) return result.optCount;

        // NX> work on count the tally here
        return result.optCount;
    }
}
