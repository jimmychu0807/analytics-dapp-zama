// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { SepoliaZamaGatewayConfig } from "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import { IAnalytic } from "./interfaces/IAnalytic.sol";
import { QuestionSpecLib } from "./QuestionSpecLib.sol";
import { console } from "hardhat/console.sol";

contract Analytic is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller, IAnalytic {
    // --- library ---
    using QuestionSpecLib for QuestionSpecLib.QuestionSpec;

    // --- constant ---
    uint16 public constant MAX_METAS = 4;
    // has to correspond to the sie of enum StatsAnsPos
    uint8 public constant STATS_ANS_SIZE = 3;

    // --- storage ---
    uint64 public nextQuestionId = 0;
    mapping(uint64 => Question) public questions;
    mapping(uint64 => Answer[]) public questionAnswers;
    mapping(uint64 => mapping(address => bool)) public questionAdmins;
    mapping(uint64 => mapping(address => bool)) public hasAnswered;

    uint64 public nextQueryRequestId = 0;
    mapping(uint64 => QueryRequest) public queryRequests;
    mapping(address => uint64[]) public userQueries;

    // --- modifier ---
    modifier questionValidAndOpen(uint64 qId) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Question storage question = questions[qId];

        if (question.state == QuestionState.Closed) revert QuestionClosed(qId);
        if (block.timestamp > question.endTime) revert QuestionClosed(qId);
        if (block.timestamp < question.startTime) revert QuestionNotOpen(qId);
        _;
    }

    modifier isQuestionAdmin(uint64 qId, address sender) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        if (!questionAdmins[qId][sender]) revert NotQuestionAdmin(qId);
        _;
    }

    modifier aboveQueryThreshold(uint64 qId) {
        Question storage question = questions[qId];
        if (getAnsLen(qId) < question.queryThreshold) revert QueryThresholdNotReach(qId);
        _;
    }

    modifier queryValidIsOwner(uint64 qId, address sender) {
        if (qId >= nextQueryRequestId) revert InvalidQueryRequest(qId);
        QueryRequest storage req = queryRequests[qId];
        if (sender != req.owner) revert NotQueryOwner(qId);
        _;
    }

    // --- viewer ---
    function getQuestion(uint64 qId) public view returns (Question memory) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        return questions[qId];
    }

    function getAnsLen(uint64 qId) public view returns (uint256) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Answer[] memory answers = questionAnswers[qId];
        return answers.length;
    }

    function getUserQueryRequestList(address user, uint64 qId) public view returns (uint64[] memory) {
        uint64[] storage queries = userQueries[user];

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

    function getQueryRequest(uint64 reqId) public view returns (QueryRequest memory) {
        QueryRequest storage req = queryRequests[reqId];
        return req;
    }

    function getQueryResult(
        uint64 reqId
    ) public view queryValidIsOwner(reqId, msg.sender) returns (QueryResult memory) {
        // require the query request state to be completed
        QueryRequest storage req = queryRequests[reqId];
        if (req.state != RequestState.Completed) revert QueryNotCompleted(reqId);

        return QueryResult({ acc: req.acc, filteredAnsCount: req.ansCount, ttlAnsCount: req.accSteps });
    }

    // --- write function ---
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

    function closeQuestion(uint64 qId) public isQuestionAdmin(qId, msg.sender) {
        Question storage question = questions[qId];
        if (question.state != QuestionState.Closed) {
            question.state = QuestionState.Closed;
        }
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

    function confirmOrRejectAnswer(uint256 reqId, bool decValid) external onlyGateway {
        uint64 qId = uint64(getParamsUint256(reqId)[0]);
        address sender = getParamsAddress(reqId)[0];

        console.log("sender: %s, reqId: %s, decValid: %s", sender, reqId, decValid);

        if (!decValid) revert RejectAnswer(qId, sender);

        // valid Answer
        euint32[] memory params = getParamsEUint32(reqId);

        console.log("qId: %s, param len: %s", qId, params.length);

        euint32[] memory metaVals = new euint32[](params.length - 1);
        for (uint256 i = 1; i < params.length; i++) {
            metaVals[i - 1] = params[i];
        }

        Answer memory ans = Answer({ val: params[0], metaVals: metaVals });
        questionAnswers[qId].push(ans);
        hasAnswered[qId][sender] = true;
        console.log("answer len: %s", questionAnswers[qId].length);

        emit ConfirmAnswer(qId, sender);
        console.log("emit event");
    }

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

    function deleteQuery(uint64 reqId) public queryValidIsOwner(reqId, msg.sender) {
        // Can only be deleted by the owner
        QueryRequest storage req = queryRequests[reqId];
        if (req.owner != msg.sender) revert NotQueryOwner(reqId);
        delete queryRequests[reqId];

        // TODO: delete it from userQueries storage

        emit QueryRequestDeleted(reqId);
    }

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

    // --- Internal Helper methods ---
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

    function _checkPredicate(Answer storage ans, Predicate storage predicate) internal returns (ebool) {
        if (predicate.op == PredicateOp.EQ) return TFHE.eq(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        if (predicate.op == PredicateOp.NE) return TFHE.ne(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        if (predicate.op == PredicateOp.GE) return TFHE.ge(ans.metaVals[predicate.metaOpt], predicate.metaVal);
        return TFHE.le(ans.metaVals[predicate.metaOpt], predicate.metaVal);
    }
}
