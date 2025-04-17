// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { SepoliaZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import { IVoting } from "./interfaces/IVoting.sol";
// import { console } from "hardhat/console.sol";

contract Voting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller, IVoting {
    // --- constant ---
    uint16 public constant MAX_QUESTION_LEN = 512;
    uint16 public constant MAX_OPTIONS = 32;

    // --- storage ---
    uint64 public nextProposalId = 0;
    uint64 public nextQueryRequestId = 0;
    mapping(uint64 => Proposal) public proposals;
    mapping(uint64 => Vote[]) public proposalVotes;
    mapping(uint64 => mapping(address => bool)) public hasVoted;
    mapping(uint64 => QueryRequest) public queryRequests;

    // --- viewer ---
    function getProposal(uint64 proposalId) public view returns (Proposal memory proposal) {
        require(proposalId < nextProposalId, "Invalid proposalId");
        proposal = proposals[proposalId];
    }

    function getVotesLen(uint64 proposalId) public view returns (uint256 voteLen) {
        require(proposalId < nextProposalId, "Invalid proposalId");
        Vote[] memory oneProposalVotes = proposalVotes[proposalId];
        voteLen = oneProposalVotes.length;
    }

    // --- write function ---

    function newProposal(
        string calldata _question,
        string[] calldata _metaOpts,
        uint64 _queryThreshold,
        uint256 _startTime,
        uint256 _endTime
    ) public returns (Proposal memory proposal) {
        require(bytes(_question).length <= MAX_QUESTION_LEN, "Question exceed 512 bytes");
        require(_metaOpts.length <= MAX_OPTIONS, "Options exceed 32 options");
        require(_startTime < _endTime, "Start time is gte to end time");

        proposal = Proposal({
            admin: msg.sender,
            question: _question,
            metaOpts: _metaOpts,
            startTime: _startTime,
            endTime: _endTime,
            queryThreshold: _queryThreshold
        });

        uint64 proposalId = nextProposalId;
        proposals[proposalId] = proposal;
        nextProposalId += 1;

        emit ProposalCreated(msg.sender, proposalId, _startTime, _endTime);
    }

    function castVote(
        uint64 proposalId,
        einput rating,
        einput optVal1,
        einput optVal2,
        einput optVal3,
        bytes calldata inputProof
    ) public {
        require(proposalId < nextProposalId, "Invalid ProposalId.");
        require(!hasVoted[proposalId][msg.sender], "Sender has voted already.");

        Proposal storage proposal = proposals[proposalId];
        uint256 currentTS = block.timestamp;
        require(currentTS >= proposal.startTime, "The voting hasn't started yet.");
        require(currentTS <= proposal.endTime, "The voting has ended already.");

        euint64[] memory metaVals = new euint64[](3);
        metaVals[0] = TFHE.asEuint64(optVal1, inputProof);
        metaVals[1] = TFHE.asEuint64(optVal2, inputProof);
        metaVals[2] = TFHE.asEuint64(optVal3, inputProof);

        Vote memory vote = Vote({ rating: TFHE.asEuint64(rating, inputProof), metaVals: metaVals });

        TFHE.allowThis(vote.rating);
        TFHE.allowThis(vote.metaVals[0]);
        TFHE.allowThis(vote.metaVals[1]);
        TFHE.allowThis(vote.metaVals[2]);

        proposalVotes[proposalId].push(vote);
        hasVoted[proposalId][msg.sender] = true;

        emit VoteCasted(msg.sender, proposalId);
    }

    function requestQuery(
        uint64 proposalId,
        AggregateOp aggOp,
        Predicate[] calldata predicates,
        bytes calldata inputProof
    ) public returns (uint64 reqId) {
        require(proposalId < nextProposalId, "Invalid ProposalId.");
        Proposal storage proposal = proposals[proposalId];
        Vote[] storage oneProposalVotes = proposalVotes[proposalId];
        require(oneProposalVotes.length >= proposal.queryThreshold, "Vote threshold not reached yet");

        // create the queryRequest
        QueryRequest memory queryReq = QueryRequest({
            proposalId: proposalId,
            owner: msg.sender,
            aggOp: aggOp,
            predicates: predicates,
            inputProof: inputProof,
            acc: TFHE.asEuint64(0),
            accSteps: 0,
            state: RequestState.Initialized
        });

        TFHE.allowThis(queryReq.acc);
        TFHE.allow(queryReq.acc, msg.sender);

        queryRequests[nextQueryRequestId] = queryReq;
        reqId = nextQueryRequestId;
        nextQueryRequestId += 1;

        emit QueryRequestCreated(reqId, msg.sender);
    }

    function deleteQuery(uint64 reqId) public {
        // Can only be deleted by the owner
        QueryRequest storage req = queryRequests[reqId];
        require(req.owner == msg.sender, "Not the owner of the query request");
        delete queryRequests[reqId];
        emit QueryRequestDeleted(reqId);
    }

    function executeQuery(uint64 reqId, uint64 steps) public {
        QueryRequest storage req = queryRequests[reqId];
        Vote[] storage oneProposalVotes = proposalVotes[req.proposalId];

        if (req.state == RequestState.Completed) {
            revert("query has executed completely");
        }

        uint64 actualSteps = steps;
        uint64 stepsToEnd = uint64(oneProposalVotes.length) - req.accSteps;
        if (stepsToEnd < steps) actualSteps = stepsToEnd;

        // --- This is where the query execution happens ---
        euint64 eZero = TFHE.asEuint64(0);
        ebool eTrue = TFHE.asEbool(true);
        ebool eFalse = TFHE.asEbool(false);
        euint64 acc = req.acc;

        for (uint64 vIdx = req.accSteps; vIdx < req.accSteps + actualSteps; vIdx += 1) {
            Vote storage oneVote = oneProposalVotes[vIdx];
            ebool accepted = eTrue;

            // connect predicate together with "AND" operator
            for (uint256 pIdx = 0; pIdx < req.predicates.length; pIdx += 1) {
                accepted = TFHE.select(
                    _checkPredicate(oneVote, req.predicates[pIdx], req.inputProof),
                    accepted,
                    eFalse
                );
            }

            euint64 val = TFHE.select(accepted, oneVote.rating, eZero);

            // note: 0 won't work for min as a nullifier
            acc = _aggregateVote(acc, req.aggOp, val);
        }

        TFHE.allowThis(acc);
        TFHE.allow(acc, req.owner);

        // --- Writing back to the storage
        req.acc = acc;
        req.accSteps += actualSteps;
        if (req.accSteps == oneProposalVotes.length) {
            req.state = RequestState.Completed;
            emit QueryExecutionCompleted(reqId);
        } else {
            emit QueryExecutionRunning(reqId, req.accSteps, uint64(oneProposalVotes.length));
        }
    }

    function getQueryResult(uint64 reqId) public view returns (euint64) {
        // require the query request state to be completed
        QueryRequest storage req = queryRequests[reqId];
        require(req.owner == msg.sender, "Not the owner of the query request");
        require(req.state == RequestState.Completed, "request not execute to completion yet");
        return req.acc;
    }

    function _checkPredicate(
        Vote storage vote,
        Predicate storage predicate,
        bytes storage inputProof
    ) internal returns (ebool accepted) {
        ebool eTrue = TFHE.asEbool(true);
        ebool eFalse = TFHE.asEbool(false);

        euint64 checkVal = vote.metaVals[predicate.metaOpt];
        euint64 predicateVal = TFHE.asEuint64(predicate.handle, inputProof);

        ebool isEQ = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.EQ), TFHE.eq(checkVal, predicateVal), eFalse);
        ebool isNE = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.NE), TFHE.ne(checkVal, predicateVal), eFalse);
        ebool isGT = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.GT), TFHE.gt(checkVal, predicateVal), eFalse);
        ebool isLT = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.LT), TFHE.lt(checkVal, predicateVal), eFalse);

        // prettier-ignore
        accepted = TFHE.select(
            isEQ,
            eTrue,
            TFHE.select(
                isNE,
                eTrue,
                TFHE.select(
                    isGT,
                    eTrue,
                    TFHE.select(
                        isLT,
                        eTrue,
                        eFalse
                    )
                )
            )
        );
    }

    function _aggregateVote(euint64 acc, AggregateOp aggOp, euint64 val) internal returns (euint64 retVal) {
        euint64 eZero = TFHE.asEuint64(0);
        euint64 eOne = TFHE.asEuint64(1);

        retVal = TFHE.add(acc, val);

        // prettier-ignore
        // retVal = TFHE.select(
        //     TFHE.asEbool(aggOp == AggregateOp.COUNT),
        //     TFHE.add(acc, TFHE.select(TFHE.eq(val, eZero), eZero, eOne)),
        //     TFHE.select(
        //         TFHE.asEbool(aggOp == AggregateOp.SUM),
        //         TFHE.add(acc, val),
        //         TFHE.select(
        //             TFHE.asEbool(aggOp == AggregateOp.MIN),
        //             TFHE.min(acc, val),
        //             TFHE.max(acc, val)
        //         )
        //     )
        // );
    }
}
