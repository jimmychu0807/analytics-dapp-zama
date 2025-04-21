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
    function getQuestion(uint64 qId) public view returns (Question memory) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        return questions[qId];
    }

    function getAnsLen(uint64 qId) public view returns (uint256) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Answer[] memory answers = questionAnswers[qId];
        return answers.length;
    }

    // --- modifier ---
    modifier questionValidAndOpen(uint64 qId) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        Question storage question = questions[qId];

        if (question.state == QuestionState.Closed) revert QuestionClosed(qId);
        if (block.timestamp > question.endTime) revert QuestionClosed(qId);
        _;
    }

    modifier isQuestionAdmin(uint64 qId, address sender) {
        if (qId >= nextQuestionId) revert InvalidQuestion(qId);
        if (!isQuestionAdmins[qId][sender]) revert NotQuestionAdmin(qId);
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

    // --- write function ---

    function newQuestion(
        string calldata _qText,
        MetaOpt[] calldata _metaOpts,
        AggregateOp _op,
        uint32 _ansMin,
        uint32 _ansMax,
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
            op: _op,
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

        // Check the encrypted input and put result in eValid.
        // Later on we will decrypt this value to check the validity
        euint32 eAns = TFHE.asEuint32(ans, inputProof);
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
        addParamsEUint32(reqId, eAns);
        TFHE.allowThis(eAns);

        for (uint256 mIdx = 0; mIdx < eMetaAns.length; ++mIdx) {
            addParamsEUint16(reqId, eMetaAns[mIdx]);
            TFHE.allowThis(eMetaAns[mIdx]);
        }
    }

    function confirmOrRejectAnswer(uint256 reqId, bool decValid) external onlyGateway {
        uint64 qId = uint64(getParamsUint256(reqId)[0]);
        address sender = getParamsAddress(reqId)[0];

        if (!decValid) revert RejectAnswer(qId, sender);

        // valid Answer
        // prettier-ignore
        Answer memory ans = Answer({
            val: getParamsEUint32(reqId)[0],
            metaVals: getParamsEUint16(reqId)
        });

        questionAnswers[qId].push(ans);
        hasAnswered[qId][sender] = true;
        emit ConfirmAnswer(qId, sender);
    }

    function requestQuery(
        uint64 qId,
        PredicateInput[] calldata predicateInputs,
        bytes calldata inputProof
    ) public isQuestionAdmin(qId, msg.sender) aboveQueryThreshold(qId) returns (uint64 reqId) {
        reqId = nextQueryRequestId;
        Question storage question = questions[qId];

        euint32 eZero = TFHE.asEuint32(0);
        euint32[] memory acc = new euint32[](question.ansMax + 1);
        for (uint64 i = question.ansMin; i <= question.ansMax; i++) {
            acc[i] = eZero;
        }

        Predicate[] memory predicates = new Predicate[](predicateInputs.length);
        for (uint256 pIdx = 0; pIdx < predicateInputs.length; pIdx++) {
            predicates[pIdx] = Predicate({
                metaOpt: TFHE.asEuint8(predicateInputs[pIdx].metaOpt, inputProof),
                op: predicateInputs[pIdx].op,
                metaVal: TFHE.asEuint16(predicateInputs[pIdx].metaVal, inputProof)
            });
        }

        // create the queryRequest
        QueryRequest memory queryReq = QueryRequest({
            questionId: qId,
            owner: msg.sender,
            predicates: predicates,
            acc: acc,
            accSteps: 0,
            state: RequestState.Initialized
        });

        queryRequests[reqId] = queryReq;
        nextQueryRequestId += 1;

        emit QueryRequestCreated(reqId, msg.sender);
    }

    function deleteQuery(uint64 reqId) public queryValidIsOwner(reqId, msg.sender) {
        // Can only be deleted by the owner
        QueryRequest storage req = queryRequests[reqId];
        if (req.owner != msg.sender) revert NotQueryOwner(reqId);
        delete queryRequests[reqId];
        emit QueryRequestDeleted(reqId);
    }

    function executeQuery(uint64 reqId, uint64 steps) public queryValidIsOwner(reqId, msg.sender) {
        QueryRequest storage req = queryRequests[reqId];
        if (req.state == RequestState.Completed) revert QueryHasCompleted(reqId);

        Question storage question = questions[req.questionId];
        Answer[] storage answers = questionAnswers[req.questionId];

        uint64 actualSteps = steps;
        uint64 stepsToEnd = uint64(answers.length) - req.accSteps;
        if (stepsToEnd < steps) actualSteps = stepsToEnd;

        // --- This is where the query execution happens ---
        ebool eTrue = TFHE.asEbool(true);
        // euint64 eNullifier = TFHE.asEuint64(0);
        // ebool eFalse = TFHE.asEbool(false);
        euint32[] storage acc = req.acc;

        for (uint64 ai = req.accSteps; ai < req.accSteps + actualSteps; ai += 1) {
            Answer storage ans = answers[ai];
            ebool accepted = eTrue;

            // connect predicate together with "AND" operator
            for (uint256 pi = 0; pi < req.predicates.length; pi += 1) {
                accepted = TFHE.and(_checkPredicate(ans, req.predicates[pi]), accepted);
            }

            // Add count
            for (uint32 accIdx = question.ansMin; accIdx <= question.ansMax; accIdx++) {
                // cnt is either a 0 or 1
                // prettier-ignore
                euint32 cnt = TFHE.asEuint32(TFHE.and(
                    accepted,
                    TFHE.eq(ans.val, TFHE.asEuint32(accIdx))
                ));

                acc[accIdx] = TFHE.add(acc[accIdx], cnt);
            }
        }

        // --- Writing back to the storage
        req.accSteps += actualSteps;
        if (req.accSteps == answers.length) {
            req.state = RequestState.Completed;

            // granting read access to the req owner of the result
            for (uint256 ai = question.ansMin; ai <= question.ansMax; ai++) {
                TFHE.allowThis(req.acc[ai]);
                TFHE.allow(req.acc[ai], req.owner);
            }

            emit QueryExecutionCompleted(reqId);
        } else {
            emit QueryExecutionRunning(reqId, req.accSteps, uint64(answers.length));
        }
    }

    function getQueryResult(uint64 reqId) public view queryValidIsOwner(reqId, msg.sender) returns (euint32[] memory) {
        // require the query request state to be completed
        QueryRequest storage req = queryRequests[reqId];
        if (req.state != RequestState.Completed) revert QueryNotCompleted(reqId);

        return req.acc;
    }

    // // --- Internal Helper methods ---

    function _checkPredicate(Answer storage ans, Predicate storage predicate) internal returns (ebool accepted) {
        accepted = TFHE.asEbool(true);
    }

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
