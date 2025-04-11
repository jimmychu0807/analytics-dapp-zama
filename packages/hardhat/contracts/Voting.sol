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

contract Voting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    // --- constant ---
    uint16 public constant MAX_QUESTION_LEN = 512;
    uint16 public constant MAX_VOTE_PTS = 255;
    uint16 public constant MAX_OPTIONS = 32;

    // --- event ---
    event ProposalCreated(address indexed sender, uint64 indexed proposalId, uint256 startTime, uint256 endTime);

    // --- storage ---
    address admin;
    uint64 nextProposalId = 0;
    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => euint256[]) public votes;
    mapping(uint64 => address) public hasVoted;

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
        Gateway.requestDecryption(cts, this.checkVoteCB.selector, 0, block.timestamp + 100, false);

        // check the user hasn't voted on that proposal
        // check the current timestamp fall between start and end timestamp
        // check the vote is valid
    }

    function checkVoteCB(uint256 reqId, uint64 proposalId, uint256 decVotes)
        onlyGateway
        public
    {
        console.log("callback: {reqId: %s, proposalId: %s, votes: %s}", reqId, proposalId, decVotes);
    }
}

