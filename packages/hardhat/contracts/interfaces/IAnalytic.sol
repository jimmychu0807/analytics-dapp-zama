// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { einput, euint16, euint64 } from "fhevm/lib/TFHE.sol";

interface IAnalytic {
    enum AggregateOp {
        COUNT, // For example 1 - count on the options pollers choose
        STATS // For example 2 - perform min,max,avg on the numeric ans people give
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
        uint64 ansMin;
        uint64 ansMax;
        MetaOpt[] metaOpts;
        AggregateOp op;
        uint256 startTime;
        uint256 endTime;
        QuestionState state;
        uint16 queryThreshold;
    }

    struct QueryRequest {
        uint64 reqId;
        address owner;
        Predicate[] predicates;
        bytes inputProof;
        euint64 acc;
        uint64 accSteps;
        RequestState state;
    }

    struct Predicate {
        uint64 metaOpt;
        PredicateOp op;
        uint64 value;
    }

    struct Answer {
        euint64 val;
        euint16[] metaVals;

        // note:
        // when answering, we need to check if the answer is valid `ebool valid`
        // After and'ing all the condition and decrypt, if it is `false` then
        // we emit an event of invalid answer.
    }

    // All errors
    error InvalidQuestionParam(string reason);
    error InvalidQuestionMetaParam(string reason);
    error InvalidQuestion(uint64 qId);
    error QuestionClosed(uint64 qId);
    error AlreadyAnswered(uint64 qId, address sender);
    error MetaAnswerNumberNotMatch(uint64 qId, uint256 metaAnsLen, uint256 metaOptLen);
    error RejectAnswer(uint64 qId, address sender);

    // All the events
    event QuestionCreated(address indexed sender, uint64 indexed qId, uint256 startTime, uint256 endTime);
    event ConfirmAnswer(uint64 indexed qId, address indexed sender);

    event QueryRequestCreated(uint64 reqId, address owner);
    event QueryRequestDeleted(uint64 reqId);
    event QueryExecutionCompleted(uint64 reqId);
    event QueryExecutionRunning(uint64 reqId, uint64 accSteps, uint64 ttl);
}
