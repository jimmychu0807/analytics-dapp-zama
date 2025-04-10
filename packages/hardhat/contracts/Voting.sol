// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

struct Proposal {
    address admin;
    string question;
    string[] options;
    uint16 userVotePoints;
    uint16 maxOptionPoints;
}

struct Vote {
    eaddress voter;
    euint16[] optionVote;
}

contract Voting is SepoliaZamaFHEVMConfig {
    // --- constant ---
    uint16 public constant MAX_QUESTION_LEN = 512;
    uint16 public constant MAX_VOTE_PTS = 1000;
    uint16 public constant MAX_OPTIONS = 32;

    // --- event ---
    event ProposalCreated(address indexed sender, uint64 indexed proposalId);

    // --- storage ---
    address admin;
    uint64 nextProposalId = 0;
    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => Vote[]) public votes;

    function newProposal(
        string calldata _question,
        string[] calldata _options,
        uint16 _userVotePoints,
        uint16 _maxOptionPoints
    ) public returns (Proposal memory proposal) {
        require (bytes(_question).length <= MAX_QUESTION_LEN, "Question exceed 512 bytes.");
        require(_options.length <= MAX_OPTIONS, "Options exceed 32 options");
        require(_userVotePoints <= MAX_VOTE_PTS, "User vote points exceed 1000");
        require(_maxOptionPoints <= MAX_VOTE_PTS, "Option max vote points exceed 1000");

        proposal = Proposal({
            admin: msg.sender,
            question: _question,
            options: _options,
            userVotePoints: _userVotePoints,
            maxOptionPoints: _maxOptionPoints
        });

        uint64 proposalId = nextProposalId;
        proposals[proposalId] = proposal;
        nextProposalId += 1;

        emit ProposalCreated(msg.sender, proposalId);
    }
}

