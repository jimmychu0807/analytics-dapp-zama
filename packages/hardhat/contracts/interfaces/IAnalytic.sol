// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

interface IAnalytic {
    enum AggregateOp {
        Count, // For example 1 - count on the options pollers choose
        Stats // For example 2 - perform min,max,avg on the numeric ans people give
    }

    enum StatsAnsPos {
        Min,
        Avg,
        Max
    }

    enum PredicateOp {
        EQ,
        NE,
        GT,
        LT
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

    struct MetaOpt {
        string text;
        uint16 min;
        uint16 max;
    }

    struct Question {
        string qText;
        uint32 ansMin;
        uint32 ansMax;
        MetaOpt[] metaOpts;
        AggregateOp op;
        uint256 startTime;
        uint256 endTime;
        QuestionState state;
        uint16 queryThreshold;
    }

    struct QueryRequest {
        uint64 questionId;
        address owner;
        Predicate[] predicates;
        euint32[] acc;
        uint64 accSteps;
        RequestState state;
    }

    struct Predicate {
        uint8 metaOpt;
        PredicateOp op;
        uint16 metaVal;
    }

    struct Answer {
        euint32 val;
        euint16[] metaVals;
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
