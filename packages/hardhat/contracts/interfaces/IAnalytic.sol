// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "../QuestionSpecLib.sol";

/// @dev Corresponding to the size of enum StatsAnsPos
uint8 constant STATS_ANS_SIZE = 3;

interface IAnalytic {
    enum StatsAnsPos {
        Min,
        Sum,
        Max
    }

    enum PredicateOp {
        /// @dev equal
        EQ,
        /// @dev not equal
        NE,
        /// @dev greater than or equal
        GE,
        /// @dev less than or equal
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

    /// This object type is also called as Quesetion Set in documentation
    struct Question {
        /// @dev The main question
        QuestionSpecLib.QuestionSpec main;
        /// @dev A list of meta questions
        QuestionSpecLib.QuestionSpec[] metas;
        /// @dev time the question starts accepting answers
        uint256 startTime;
        /// @dev time the question will no longer accepting answers
        uint256 endTime;
        QuestionState state;
        /// @dev The minimum number of answers before a query request can issue to the question.
        uint32 queryThreshold;
    }

    /// Query Request object type
    struct QueryRequest {
        /// @dev The question ID this query request refers to
        uint64 questionId;
        /// @dev Wwner of the query request
        address owner;
        /// @dev a list of predicates of this query request.
        Predicate[] predicates;
        /// @dev The accumulated intermediate result so far in the query request
        euint32[] acc;
        /// @dev Number of answers that satisfy the predicates and got accumulated.
        euint32 ansCount;
        /// @dev Total number of answers the query request has processed.
        uint32 accSteps;
        /// @dev Query request state
        RequestState state;
    }

    /// Query Result object type
    struct QueryResult {
        /// @dev The accumulated result of the query request
        euint32[] acc;
        /// @dev Number of answers that satisfy the predicates and got accumulated.
        euint32 filteredAnsCount;
        /// @dev Total number of answers the query request has processed.
        uint32 ttlAnsCount;
    }

    /// Predicate object type
    struct Predicate {
        /// @dev The index of the meta questions this predicate refer to.
        uint8 metaOpt;
        /// @dev Predicate operator
        PredicateOp op;
        /// @dev The target value to be compared against
        uint32 metaVal;
    }

    /// User answer object type
    struct Answer {
        /// @dev Encrypted answer value for the main question in the question set.
        euint32 val;
        /// @dev Encrypted answer values for a list of meta questions in the question set.
        euint32[] metaVals;
    }

    // All errors
    error InvalidQuestionParam(string reason);
    error InvalidQuestionMetaParam(string reason);
    error InvalidQuestion(uint64 qId);
    error QuestionAlreadyClosed(uint64 qId);
    error QuestionNotOpenYet(uint64 qId);
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
    event QuestionClosed(uint64 indexed qId);
    event ConfirmAnswer(uint64 indexed qId, address indexed sender);
    event QueryRequestCreated(uint64 reqId, address owner);
    event QueryRequestDeleted(uint64 reqId);

    event QueryExecutionCompleted(uint64 reqId);
    event QueryExecutionRunning(uint64 reqId, uint64 accSteps, uint64 ttl);
}
