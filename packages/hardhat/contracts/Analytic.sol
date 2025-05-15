// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { SepoliaZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import { IAnalytic, STATS_ANS_SIZE } from "./interfaces/IAnalytic.sol";
import { QuestionSpecLib } from "./QuestionSpecLib.sol";

/// @dev Maximum number of meta questions in a question set.
uint16 constant MAX_METAS = 4;

/**
 * @title Analytic
 * Module that allow users (question creators) to create analytic question set, and respondent
 *   to answer these questions. Answers are encrypted client-side and stored on-chain. Later on, question
 *   creators and query back on the answers with custom predicates.
 * @author Jimmy Chu
 */
contract Analytic is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller, IAnalytic {
    // --- library ---

    using QuestionSpecLib for QuestionSpecLib.QuestionSpec;

    // --- storage ---

    /// @dev The next Question ID.
    uint64 public nextQuestionId = 0;
    /// @dev Mapping of question ID to the Question object.
    mapping(uint64 => Question) public questions;
    /// @dev Mapping of question ID to a list of Answer objects.
    mapping(uint64 => Answer[]) public questionAnswers;
    /// @dev Store for a question if a user is an admin.
    mapping(uint64 => mapping(address => bool)) public questionAdmins;
    /// @dev Store for a question if a user has answered it already.
    mapping(uint64 => mapping(address => bool)) public hasAnswered;
    /// @dev the next Query Request ID.
    uint64 public nextQueryRequestId = 0;
    /// @dev Mapping of Query Request ID to the Query Request Object.
    mapping(uint64 => QueryRequest) public queryRequests;
    /// @dev Mapping from users to the IDs of their query requests.
    mapping(address => uint64[]) public userQueries;

    // --- modifier ---

    /**
     * Modifier ensures the question ID is valid and the question is still open to answer.
     * @dev It doesn't just plainly check its state but also check the question startTime and endTime.
     * @param qId The Id of the question set to be checked
     */
    modifier questionValidAndOpen(uint64 qId) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Question storage question = questions[qId];

        if (question.state == QuestionState.Closed) revert QuestionAlreadyClosed(qId);
        if (block.timestamp > question.endTime) revert QuestionAlreadyClosed(qId);
        if (block.timestamp < question.startTime) revert QuestionNotOpenYet(qId);
        _;
    }

    /**
     * Modifier ensures a user (sender) is the admin of the question.
     * @param qId The Id of the question.
     * @param sender The user.
     */
    modifier isQuestionAdmin(uint64 qId, address sender) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        if (!questionAdmins[qId][sender]) revert NotQuestionAdmin(qId);
        _;
    }

    /**
     * Modifier ensures a question has number of answers above its query threshold
     * @param qId The Id of the question set to check.
     */
    modifier aboveQueryThreshold(uint64 qId) {
        Question storage question = questions[qId];
        if (getAnsLen(qId) < question.queryThreshold) revert QueryThresholdNotReach(qId);
        _;
    }

    /**
     * Modifier ensures a query request ID is valid and the user is the query request owner
     * @param qId The query request ID
     * @param sender The user
     */
    modifier queryValidIsOwner(uint64 qId, address sender) {
        if (qId >= nextQueryRequestId) revert InvalidQueryRequest(qId);
        QueryRequest storage req = queryRequests[qId];
        if (sender != req.owner) revert NotQueryOwner(qId);
        _;
    }

    // --- viewer function ---

    /**
     * Get back the Question object given the question ID.
     * @param qId The question ID.
     * @return The Question object.
     */
    function getQuestion(uint64 qId) public view returns (Question memory) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        return questions[qId];
    }

    /**
     * Get back the number of answers of the question.
     * @param qId The question ID.
     * @return The number of answers.
     */
    function getAnsLen(uint64 qId) public view returns (uint256) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Answer[] memory answers = questionAnswers[qId];
        return answers.length;
    }

    /**
     * Get back an array of the `user` query request IDs with respect to a specified question ID `qId`.
     * @param user The user
     * @param qId The specified question ID.
     * @return A list of query request ID that belong to the user for a given question ID.
     */
    function getUserQueryRequestList(address user, uint64 qId) public view returns (uint64[] memory) {
        uint64[] storage queries = userQueries[user];

        // We go through the query list twice.
        // The first time to count number of answers that matches the qId
        // The second time we add the query request ID to the result list.
        uint256 len = 0;
        for (uint256 i = 0; i < queries.length; i++) {
            QueryRequest storage qr = queryRequests[queries[i]];
            if (qr.questionId == qId) len += 1;
        }
        uint64[] memory list = new uint64[](len);

        // Early return as the list is going to be empty
        if (len == 0) return list;

        uint256 idx = 0;
        for (uint256 i = 0; i < queries.length; i++) {
            QueryRequest storage qr = queryRequests[queries[i]];
            if (qr.questionId == qId) {
                list[idx] = queries[i];
                idx += 1;
            }
        }
        return list;
    }

    /**
     * Get the Query Request object of the given query request ID.
     * @param reqId The query request ID.
     * @return The Query Request object.
     */
    function getQueryRequest(uint64 reqId) public view returns (QueryRequest memory) {
        QueryRequest storage req = queryRequests[reqId];
        return req;
    }

    /**
     * Get a Query Result object back of the given query request ID. It will only return if the
     * query request has completed processing. Otherwise the function reverts.
     * @param reqId The query request ID.
     * @return The query result, which are fields extracted from the Query Request object.
     */
    function getQueryResult(
        uint64 reqId
    ) public view queryValidIsOwner(reqId, msg.sender) returns (QueryResult memory) {
        // require the query request state to be completed
        QueryRequest storage req = queryRequests[reqId];
        if (req.state != RequestState.Completed) revert QueryNotCompleted(reqId);

        return QueryResult({ acc: req.acc, filteredAnsCount: req.ansCount, ttlAnsCount: req.accSteps });
    }

    // --- write function ---

    /**
     * Store a new question set on-chain. The sender is also set to be the admin of the question set.
     * @param _main The main question. It is a QuestionSpec object.
     * @param _metas A list of meta questions. Each item is a QuestionSpec object.
     * @param _startTime The starting time when the question accept answers.
     * @param _endTime The ending time when the question will not accept new answers.
     * @param _queryThreshold The minimum number of answers before a query request can be issued for the question.
     */
    function newQuestion(
        QuestionSpecLib.QuestionSpec calldata _main,
        QuestionSpecLib.QuestionSpec[] calldata _metas,
        uint256 _startTime,
        uint256 _endTime,
        uint32 _queryThreshold
    ) public {
        if (_metas.length > MAX_METAS) revert InvalidQuestionParam("max meta options exceeded");
        if (_startTime >= _endTime) revert InvalidQuestionParam("Start time should be less than end time");

        _main.validate();
        for (uint256 i = 0; i < _metas.length; i++) _metas[i].validate();

        uint64 qId = nextQuestionId;
        Question memory question = Question({
            main: _main,
            metas: _metas,
            startTime: _startTime,
            endTime: _endTime,
            state: QuestionState.Initialized,
            queryThreshold: _queryThreshold
        });
        questionAdmins[qId][msg.sender] = true;
        questions[qId] = question;
        nextQuestionId += 1;

        emit QuestionCreated(msg.sender, qId, _startTime, _endTime);
    }

    /**
     * Close a question set to prevent the question from aceepting new answer set.
     * @param qId The ID of the question to be closed.
     */
    function closeQuestion(uint64 qId) public isQuestionAdmin(qId, msg.sender) {
        Question storage question = questions[qId];
        if (question.state != QuestionState.Closed) {
            question.state = QuestionState.Closed;
            emit QuestionClosed(qId);
        }
    }

    /**
     * Answer a question from a user
     * @dev The function validates the answer to be inside the specified bounds in the question set.
     *   This `eValid` eboolean flag is also encrypted and we cannot plainly read it, So we must
     *   request to decrypt this value to the fhEVM gateway. We also add enough parameters to the
     *   decryption request to reconstruct back the user and the answer set.
     *
     * @param qId The ID of the question set to answer.
     * @param ans The encrypted answer to the main question of the question set.
     * @param metaAns List of encrypted answers to the meta questions of the question set.
     * @param inputProof The input proof for all the included encrypted values in calldata.
     */
    function answer(
        uint64 qId,
        einput ans,
        einput[] calldata metaAns,
        bytes calldata inputProof
    ) public questionValidAndOpen(qId) {
        if (hasAnswered[qId][msg.sender]) revert AlreadyAnswered(qId, msg.sender);

        Question storage question = questions[qId];

        // Check the metaAns len has to be equal to question metaOpts
        if (metaAns.length != question.metas.length)
            revert MetaAnswerNumberNotMatch(qId, metaAns.length, question.metas.length);

        // Update the question state
        if (question.state != QuestionState.Open) question.state = QuestionState.Open;

        // Check the encrypted input and put result in eValid.
        // Later on we will decrypt this value to check the validity
        euint32 eAns = TFHE.asEuint32(ans, inputProof);
        TFHE.allowThis(eAns);

        ebool eValid = TFHE.and(TFHE.ge(eAns, question.main.min), TFHE.le(eAns, question.main.max));

        euint32[] memory eMetaAns = new euint32[](metaAns.length);
        for (uint256 mIdx = 0; mIdx < metaAns.length; ++mIdx) {
            eMetaAns[mIdx] = TFHE.asEuint32(metaAns[mIdx], inputProof);
            TFHE.allowThis(eMetaAns[mIdx]);

            eValid = TFHE.and(
                eValid,
                TFHE.and(
                    TFHE.ge(eMetaAns[mIdx], question.metas[mIdx].min),
                    TFHE.le(eMetaAns[mIdx], question.metas[mIdx].max)
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
        addParamsEUint32(reqId, eAns);
        for (uint256 mIdx = 0; mIdx < eMetaAns.length; ++mIdx) {
            addParamsEUint32(reqId, eMetaAns[mIdx]);
        }
    }

    /**
     * To confirm or reject the answer based on the answer validity. Once valid, the encrypted answer
     *   set is stored on-chain.
     * @param reqId The request ID comes from fhEVM Gateway.
     * @param decValid The decrypted value of a boolean flag indicating if the answer set is valid.
     */
    function confirmOrRejectAnswer(uint256 reqId, bool decValid) external onlyGateway {
        uint64 qId = uint64(getParamsUint256(reqId)[0]);
        address sender = getParamsAddress(reqId)[0];

        if (!decValid) revert RejectAnswer(qId, sender);

        // valid answer here
        euint32[] memory params = getParamsEUint32(reqId);
        euint32[] memory metaVals = new euint32[](params.length - 1);
        for (uint256 i = 1; i < params.length; i++) {
            metaVals[i - 1] = params[i];
        }

        Answer memory ans = Answer({ val: params[0], metaVals: metaVals });
        questionAnswers[qId].push(ans);
        hasAnswered[qId][sender] = true;

        emit ConfirmAnswer(qId, sender);
    }

    /**
     * To create a new query request on a specific question.
     * @param qId The Id of the question user requests to query against.
     * @param predicates A list of Predicate objects to filter the answers.
     */
    function requestQuery(
        uint64 qId,
        Predicate[] calldata predicates
    ) public isQuestionAdmin(qId, msg.sender) aboveQueryThreshold(qId) returns (uint64 reqId) {
        reqId = nextQueryRequestId;
        Question storage question = questions[qId];

        euint32 eZero = TFHE.asEuint32(0);
        euint32[] memory acc;

        if (question.main.t == QuestionSpecLib.QuestionType.Option) {
            acc = new euint32[](question.main.max + 1);
            for (uint64 i = 0; i <= question.main.max; i++) {
                acc[i] = eZero;
            }
        } else {
            acc = new euint32[](STATS_ANS_SIZE);
            acc[uint256(StatsAnsPos.Min)] = TFHE.asEuint32(question.main.max);
            acc[uint256(StatsAnsPos.Sum)] = eZero;
            acc[uint256(StatsAnsPos.Max)] = TFHE.asEuint32(question.main.min);
        }

        // create the queryRequest
        QueryRequest memory queryReq = QueryRequest({
            questionId: qId,
            owner: msg.sender,
            predicates: predicates,
            acc: acc,
            accSteps: 0,
            ansCount: eZero,
            state: RequestState.Initialized
        });

        queryRequests[reqId] = queryReq;
        nextQueryRequestId += 1;
        userQueries[msg.sender].push(reqId);

        // granting access
        for (uint256 i = 0; i < queryReq.acc.length; i++) {
            TFHE.allowThis(queryReq.acc[i]);
            TFHE.allow(queryReq.acc[i], msg.sender);
        }

        TFHE.allowThis(queryReq.ansCount);
        TFHE.allow(queryReq.ansCount, msg.sender);

        emit QueryRequestCreated(reqId, msg.sender);
    }

    /**
     * To delete a query request specified in reqId
     * @param reqId The reqId of the query request to be deleted.
     */
    function deleteQuery(uint64 reqId) public queryValidIsOwner(reqId, msg.sender) {
        // Can only be deleted by the owner
        QueryRequest storage req = queryRequests[reqId];
        if (req.owner != msg.sender) revert NotQueryOwner(reqId);

        // Delete from the `queryRequests` storage.
        delete queryRequests[reqId];

        // Delete from the `userQueries` storage.
        uint64[] storage queries = userQueries[msg.sender];
        uint256 queryLen = queries.length;
        for (uint256 i = 0; i < queryLen; i++) {
            if (queries[i] == reqId) {
                // As we don't care about the order in userQueries, we just
                // take the array last element and overwrite the element to be removed,
                queries[i] = queries[queryLen - 1];
                // then remove the last element and adjust the array size.
                queries.pop();
                break;
            }
        }

        emit QueryRequestDeleted(reqId);
    }

    /**
     * To process an incomplete query request.
     * @param reqId Id of the query request.
     * @param steps Number of answers to step through. There is a gas limit on FHE operations
     *   per block. Because of the variation on the complexity of the query predicates and number of options
     *   in the main question, we allow users to specify this variable so they can experiment to
     *   maximize processing efficiency while satisfy the block gas limit.
     */
    function executeQuery(uint64 reqId, uint32 steps) public queryValidIsOwner(reqId, msg.sender) {
        QueryRequest storage req = queryRequests[reqId];
        if (req.state == RequestState.Completed) revert QueryHasCompleted(reqId);

        Question storage question = questions[req.questionId];
        Answer[] storage answers = questionAnswers[req.questionId];

        uint32 actualSteps = steps;
        uint32 stepsToEnd = uint32(answers.length) - req.accSteps;
        if (stepsToEnd < steps) actualSteps = stepsToEnd;

        ebool eTrue = TFHE.asEbool(true);
        euint32[] storage acc = req.acc;

        for (uint32 ai = req.accSteps; ai < req.accSteps + actualSteps; ai += 1) {
            Answer storage ans = answers[ai];
            ebool accepted = eTrue;

            // connect predicate together with "AND" operator
            for (uint256 pi = 0; pi < req.predicates.length; pi += 1) {
                accepted = TFHE.and(_checkPredicate(ans, req.predicates[pi]), accepted);
            }
            req.ansCount = TFHE.add(req.ansCount, TFHE.asEuint32(accepted));

            if (question.main.t == QuestionSpecLib.QuestionType.Option) {
                _aggregateCountAns(acc, req.questionId, accepted, ans);
            } else {
                _aggregateStatsAns(acc, accepted, ans);
            }
        }

        // writing back to the storage
        req.accSteps += actualSteps;

        // granting read access to the req owner of the result
        TFHE.allowThis(req.ansCount);
        TFHE.allow(req.ansCount, req.owner);
        for (uint256 ai = 0; ai < req.acc.length; ai++) {
            TFHE.allowThis(req.acc[ai]);
            TFHE.allow(req.acc[ai], req.owner);
        }

        if (req.accSteps == answers.length) {
            req.state = RequestState.Completed;
            emit QueryExecutionCompleted(reqId);
        } else {
            emit QueryExecutionRunning(reqId, req.accSteps, uint64(answers.length));
        }
    }

    // --- internal helper function ---

    /**
     * To aggregate one answer set into the accumulated result. This function perform accumulation for
     *   question type of `Value`.
     * @param acc The accumulated intermediate result stored on-chain.
     * @param accepted The encrypted boolean value to indicate if the answer should be accumulated.
     *   If this value is false, the accumulated result will not change.
     * @param ans The answer set to be accumulated.
     */
    function _aggregateStatsAns(euint32[] storage acc, ebool accepted, Answer storage ans) internal {
        // min
        uint256 minPos = uint256(StatsAnsPos.Min);
        acc[minPos] = TFHE.select(accepted, TFHE.min(acc[minPos], ans.val), acc[minPos]);

        // avg - basically summation - avg is computed at client side
        uint256 avgPos = uint256(StatsAnsPos.Sum);
        acc[avgPos] = TFHE.select(accepted, TFHE.add(acc[avgPos], ans.val), acc[avgPos]);

        // max
        uint256 maxPos = uint256(StatsAnsPos.Max);
        acc[maxPos] = TFHE.select(accepted, TFHE.max(acc[maxPos], ans.val), acc[maxPos]);
    }

    /**
     * To aggregate one answer set into the accumulated result. This function perform accumulation for
     *   question type of `Option`.
     * @param acc The accumulated intermediate result stored on-chain.
     * @param qId The ID of the question set the answer set `ans` corresponds to.
     * @param accepted The encrypted boolean value to indicate if the answer should be accumulated.
     *   If this value is false, the accumulated result will not change.
     * @param ans The answer set to be accumulated.
     */
    function _aggregateCountAns(euint32[] storage acc, uint64 qId, ebool accepted, Answer storage ans) internal {
        Question storage question = questions[qId];
        // Add count
        for (uint32 accIdx = 0; accIdx <= question.main.max; accIdx++) {
            // cnt is either a 0 or 1
            // prettier-ignore
            euint32 cnt = TFHE.asEuint32(TFHE.and(
                accepted,
                TFHE.eq(ans.val, TFHE.asEuint32(accIdx))
            ));

            acc[accIdx] = TFHE.add(acc[accIdx], cnt);
        }
    }

    /**
     * To check if an answer set satisfies a predicate.
     * @param ans The answer set to check.
     * @param predicate The predicate to check against.
     * @return An ecrypted boolean value if the answer satisfies the predicate.
     */
    function _checkPredicate(Answer storage ans, Predicate storage predicate) internal returns (ebool) {
        if (predicate.op == PredicateOp.EQ) return TFHE.eq(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        if (predicate.op == PredicateOp.NE) return TFHE.ne(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        if (predicate.op == PredicateOp.GE) return TFHE.ge(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        return TFHE.le(ans.metaVals[predicate.metaOpt], predicate.metaVal);
    }
}
