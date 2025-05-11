// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "../QuestionSpecLib.sol";

interface IAnalytic {
    enum StatsAnsPos {
        Min,
        Sum,
        Max
    }

    enum PredicateOp {
        EQ,
        NE,
        GE,
        LE
    }

    enum RequestState {
        Initialized,
        Completed
    }

    enum QuestionState {
        Initialized,
        Open,
        Closed
    }

    struct Question {
        QuestionSpecLib.QuestionSpec main;
        QuestionSpecLib.QuestionSpec[] metas;
        uint256 startTime;
        uint256 endTime;
        QuestionState state;
        uint32 queryThreshold;
    }

    struct QueryRequest {
        uint64 questionId;
        address owner;
        Predicate[] predicates;
        euint32[] acc;
        euint32 ansCount;
        uint32 accSteps;
        RequestState state;
    }

    struct QueryResult {
        euint32[] acc;
        euint32 filteredAnsCount;
        uint32 ttlAnsCount;
    }

    struct Predicate {
        uint8 metaOpt;
        PredicateOp op;
        uint32 metaVal;
    }

    struct Answer {
        euint32 val;
        euint32[] metaVals;
    }

    // All errors
    error InvalidQuestionParam(string reason);
    error InvalidQuestionMetaParam(string reason);
    error InvalidQuestion(uint64 qId);
    error QuestionClosed(uint64 qId);
    error AlreadyAnswered(uint64 qId, address sender);
    error MetaAnswerNumberNotMatch(uint64 qId, uint256 metaAnsLen, uint256 metaOptLen);
    error RejectAnswer(uint64 qId, address sender);
    error NotQuestionAdmin(uint64 qId);
    error QueryThresholdNotReach(uint64 qId);

    error InvalidQueryRequest(uint64 queryReqId);
    error NotQueryOwner(uint64 queryReqId);
    error QueryHasCompleted(uint64 queryReqId);
    error QueryNotCompleted(uint64 queryReqId);

    // All the events
    event QuestionCreated(address indexed sender, uint64 indexed qId, uint256 startTime, uint256 endTime);
    event ConfirmAnswer(uint64 indexed qId, address indexed sender);
    event QueryRequestCreated(uint64 reqId, address owner);
    event QueryRequestDeleted(uint64 reqId);

    event QueryExecutionCompleted(uint64 reqId);
    event QueryExecutionRunning(uint64 reqId, uint64 accSteps, uint64 ttl);
}
