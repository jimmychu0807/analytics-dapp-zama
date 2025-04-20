// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { SepoliaZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import { IAnalytic } from "./interfaces/IAnalytic.sol";
// import { console } from "hardhat/console.sol";

contract Analytic is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller, IAnalytic {
    // --- constant ---
    uint16 public constant QTXT_MAX_LEN = 512;
    uint16 public constant MTXT_MAX_LEN = 512;
    uint16 public constant MAX_OPTIONS = 4;

    // --- storage ---
    uint64 public nextQuestionId = 0;
    mapping(uint64 => Question) public questions;
    mapping(uint64 => Answer[]) public questionAnswers;
    mapping(uint64 => mapping(address => bool)) public isQuestionAdmins;
    mapping(uint64 => mapping(address => bool)) public hasAnswered;

    uint64 public nextQueryRequestId = 0;
    mapping(uint64 => QueryRequest) public queryRequests;

    // --- viewer ---
    function getQuestion(uint64 qId) public view returns (Question memory question) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        question = questions[qId];
    }

    // function getVotesLen(uint64 proposalId) public view returns (uint256 voteLen) {
    //     require(proposalId < nextProposalId, "Invalid proposalId");
    //     Vote[] memory oneProposalVotes = proposalVotes[proposalId];
    //     voteLen = oneProposalVotes.length;
    // }

    // --- modifier ---
    modifier questionValidAndOpen(uint64 qId) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Question storage question = questions[qId];

        if (question.state == QuestionState.Closed) revert QuestionClosed(qId);
        if (block.timestamp > question.endTime) revert QuestionClosed(qId);
        _;
    }

    // --- write function ---

    function newQuestion(
        string calldata _qText,
        MetaOpt[] calldata _metaOpts,
        uint64 _ansMin,
        uint64 _ansMax,
        uint256 _startTime,
        uint256 _endTime,
        uint16 _queryThreshold
    ) public {
        if (bytes(_qText).length > QTXT_MAX_LEN) revert InvalidQuestionParam("questionText max length exceeded");
        if (_metaOpts.length > MAX_OPTIONS) revert InvalidQuestionParam("max meta options exceeded");
        if (_startTime >= _endTime) revert InvalidQuestionParam("Start time should be less than end time");
        if (_ansMin >= _ansMax) revert InvalidQuestionParam("ansMin should be less than ansMax");

        for (uint256 i = 0; i < _metaOpts.length; i++) {
            if (bytes(_metaOpts[i].text).length > MTXT_MAX_LEN)
                revert InvalidQuestionMetaParam("metaText max length exceeded");
            if (_metaOpts[i].min >= _metaOpts[i].max) revert InvalidQuestionMetaParam("min should be less than max");
        }

        uint64 qId = nextQuestionId;

        Question memory question = Question({
            qText: _qText,
            ansMin: _ansMin,
            ansMax: _ansMax,
            metaOpts: _metaOpts,
            startTime: _startTime,
            endTime: _endTime,
            state: QuestionState.Initialized,
            queryThreshold: _queryThreshold
        });
        isQuestionAdmins[qId][msg.sender] = true;
        questions[qId] = question;
        nextQuestionId += 1;

        emit QuestionCreated(msg.sender, qId, _startTime, _endTime);
    }

    function answer(
        uint64 qId,
        einput ans,
        einput[] calldata metaAns,
        bytes calldata inputProof
    ) public questionValidAndOpen(qId) {
        if (hasAnswered[qId][msg.sender]) revert AlreadyAnswered(qId, msg.sender);

        Question storage question = questions[qId];

        // Check the metaAns len has to be equal to question metaOpts
        if (metaAns.length != question.metaOpts.length)
            revert MetaAnswerNumberNotMatch(qId, metaAns.length, question.metaOpts.length);

        // Update the question state
        if (question.state != QuestionState.Open) question.state = QuestionState.Open;

        // Check the encrypted input
        euint64 eAns = TFHE.asEuint64(ans, inputProof);
        ebool eValid = TFHE.and(TFHE.ge(eAns, question.ansMin), TFHE.le(eAns, question.ansMax));

        euint16[] memory eMetaAns = new euint16[](metaAns.length);
        for (uint256 mIdx = 0; mIdx < metaAns.length; ++mIdx) {
            eMetaAns[mIdx] = TFHE.asEuint16(metaAns[mIdx], inputProof);
            eValid = TFHE.and(
                eValid,
                TFHE.and(
                    TFHE.ge(eMetaAns[mIdx], question.metaOpts[mIdx].min),
                    TFHE.le(eMetaAns[mIdx], question.metaOpts[mIdx].max)
                )
            );
        }

        // We only want to decrypt the eValid to either confirm or reject the answer
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(eValid);
        uint256 reqId = Gateway.requestDecryption(
            cts,
            this.confirmOrRejectAnswer.selector,
            0,
            block.timestamp + 100,
            false
        );

        // Additional parameters to reconstruct back the Answer object
        addParamsUint256(reqId, uint256(qId));
        addParamsAddress(reqId, msg.sender);
        addParamsEUint64(reqId, eAns);
        for (uint256 mIdx = 0; mIdx < eMetaAns.length; ++mIdx) {
            addParamsEUint16(reqId, eMetaAns[mIdx]);
        }
    }

    function confirmOrRejectAnswer(uint256 reqId, bool decValid) public onlyGateway {
        uint64 qId = uint64(getParamsUint256(reqId)[0]);
        address sender = getParamsAddress(reqId)[0];

        if (!decValid) revert RejectAnswer(qId, sender);

        // valid Answer
        Answer memory ans = Answer({ val: getParamsEUint64(reqId)[0], metaVals: getParamsEUint16(reqId) });

        questionAnswers[qId].push(ans);
        hasAnswered[qId][sender] = true;
        emit ConfirmAnswer(qId, sender);
    }

    // function requestQuery(
    //     uint64 proposalId,
    //     AggregateOp aggOp,
    //     Predicate[] calldata predicates,
    //     bytes calldata inputProof
    // ) public returns (uint64 reqId) {
    //     require(proposalId < nextProposalId, "Invalid ProposalId.");
    //     Proposal storage proposal = proposals[proposalId];
    //     Vote[] storage oneProposalVotes = proposalVotes[proposalId];
    //     require(oneProposalVotes.length >= proposal.queryThreshold, "Vote threshold not reached yet");

    //     // create the queryRequest
    //     QueryRequest memory queryReq = QueryRequest({
    //         proposalId: proposalId,
    //         owner: msg.sender,
    //         aggOp: aggOp,
    //         predicates: predicates,
    //         inputProof: inputProof,
    //         acc: TFHE.asEuint64(0),
    //         accSteps: 0,
    //         state: RequestState.Initialized
    //     });

    //     TFHE.allowThis(queryReq.acc);
    //     TFHE.allow(queryReq.acc, msg.sender);

    //     queryRequests[nextQueryRequestId] = queryReq;
    //     reqId = nextQueryRequestId;
    //     nextQueryRequestId += 1;

    //     emit QueryRequestCreated(reqId, msg.sender);
    // }

    // function deleteQuery(uint64 reqId) public {
    //     // Can only be deleted by the owner
    //     QueryRequest storage req = queryRequests[reqId];
    //     require(req.owner == msg.sender, "Not the owner of the query request");
    //     delete queryRequests[reqId];
    //     emit QueryRequestDeleted(reqId);
    // }

    // function executeQuery(uint64 reqId, uint64 steps) public {
    //     QueryRequest storage req = queryRequests[reqId];
    //     Vote[] storage oneProposalVotes = proposalVotes[req.proposalId];

    //     if (req.state == RequestState.Completed) {
    //         revert("query has executed completely");
    //     }

    //     uint64 actualSteps = steps;
    //     uint64 stepsToEnd = uint64(oneProposalVotes.length) - req.accSteps;
    //     if (stepsToEnd < steps) actualSteps = stepsToEnd;

    //     // --- This is where the query execution happens ---
    //     euint64 eZero = TFHE.asEuint64(0);
    //     ebool eTrue = TFHE.asEbool(true);
    //     ebool eFalse = TFHE.asEbool(false);
    //     euint64 acc = req.acc;

    //     for (uint64 vIdx = req.accSteps; vIdx < req.accSteps + actualSteps; vIdx += 1) {
    //         Vote storage oneVote = oneProposalVotes[vIdx];
    //         ebool accepted = eTrue;

    //         // connect predicate together with "AND" operator
    //         for (uint256 pIdx = 0; pIdx < req.predicates.length; pIdx += 1) {
    //             accepted = TFHE.select(
    //                 _checkPredicate(oneVote, req.predicates[pIdx], req.inputProof),
    //                 accepted,
    //                 eFalse
    //             );
    //         }

    //         euint64 val = TFHE.select(
    //             accepted,
    //             oneVote.rating,
    //             // The nullifer for MIN operator is the max value of the data type
    //             TFHE.select(TFHE.asEbool(req.aggOp == AggregateOp.MIN), TFHE.asEuint64(type(uint64).max), eZero)
    //         );

    //         // note: 0 won't work for min as a nullifier
    //         acc = _aggregateVote(acc, req.aggOp, val);
    //     }

    //     TFHE.allowThis(acc);
    //     TFHE.allow(acc, req.owner);

    //     // --- Writing back to the storage
    //     req.acc = acc;
    //     req.accSteps += actualSteps;
    //     if (req.accSteps == oneProposalVotes.length) {
    //         req.state = RequestState.Completed;
    //         emit QueryExecutionCompleted(reqId);
    //     } else {
    //         emit QueryExecutionRunning(reqId, req.accSteps, uint64(oneProposalVotes.length));
    //     }
    // }

    // function getQueryResult(uint64 reqId) public view returns (euint64) {
    //     // require the query request state to be completed
    //     QueryRequest storage req = queryRequests[reqId];
    //     require(req.owner == msg.sender, "Not the owner of the query request");
    //     require(req.state == RequestState.Completed, "request not execute to completion yet");
    //     return req.acc;
    // }

    // // --- Internal Helper methods ---

    // function _checkPredicate(
    //     Vote storage vote,
    //     Predicate storage predicate,
    //     bytes storage inputProof
    // ) internal returns (ebool accepted) {
    //     ebool eTrue = TFHE.asEbool(true);
    //     ebool eFalse = TFHE.asEbool(false);

    //     euint64 checkVal = vote.metaVals[predicate.metaOpt];
    //     euint64 predicateVal = TFHE.asEuint64(predicate.handle, inputProof);

    //     ebool isEQ = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.EQ), TFHE.eq(checkVal, predicateVal), eFalse);
    //     ebool isNE = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.NE), TFHE.ne(checkVal, predicateVal), eFalse);
    //     ebool isGT = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.GT), TFHE.gt(checkVal, predicateVal), eFalse);
    //     ebool isLT = TFHE.select(TFHE.asEbool(predicate.op == PredicateOp.LT), TFHE.lt(checkVal, predicateVal), eFalse);

    //     // prettier-ignore
    //     accepted = TFHE.select(
    //         isEQ,
    //         eTrue,
    //         TFHE.select(
    //             isNE,
    //             eTrue,
    //             TFHE.select(
    //                 isGT,
    //                 eTrue,
    //                 TFHE.select(
    //                     isLT,
    //                     eTrue,
    //                     eFalse
    //                 )
    //             )
    //         )
    //     );
    // }

    // function _aggregateVote(euint64 acc, AggregateOp aggOp, euint64 val) internal returns (euint64 retVal) {
    //     euint64 eZero = TFHE.asEuint64(0);
    //     euint64 eOne = TFHE.asEuint64(1);

    //     // TODO:
    //     //   1. work on AggregateOp.AVG
    //     //   2. min doesn't work with nullifier of 0
    //     // prettier-ignore
    //     retVal = TFHE.select(
    //         TFHE.asEbool(aggOp == AggregateOp.COUNT),
    //         TFHE.add(acc, TFHE.select(TFHE.ne(val, eZero), eOne, eZero)),
    //         TFHE.select(
    //             TFHE.asEbool(aggOp == AggregateOp.SUM),
    //             TFHE.add(acc, val),
    //             TFHE.select(
    //                 TFHE.asEbool(aggOp == AggregateOp.MIN),
    //                 TFHE.min(acc, val),
    //                 TFHE.max(acc, val)
    //             )
    //         )
    //     );
    // }
}
