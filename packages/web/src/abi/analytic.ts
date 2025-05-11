import { type Abi } from "viem";

export const abi: Abi = [
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "AlreadyAnswered",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "queryReqId",
        type: "uint64",
      },
    ],
    name: "InvalidQueryRequest",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "InvalidQuestion",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "InvalidQuestionMetaParam",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "InvalidQuestionParam",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "metaAnsLen",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "metaOptLen",
        type: "uint256",
      },
    ],
    name: "MetaAnswerNumberNotMatch",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "queryReqId",
        type: "uint64",
      },
    ],
    name: "NotQueryOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "NotQuestionAdmin",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "queryReqId",
        type: "uint64",
      },
    ],
    name: "QueryHasCompleted",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "queryReqId",
        type: "uint64",
      },
    ],
    name: "QueryNotCompleted",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "QueryThresholdNotReach",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "QuestionClosed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "QuestionNotOpen",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RejectAnswer",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ConfirmAnswer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    name: "QueryExecutionCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "accSteps",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "ttl",
        type: "uint64",
      },
    ],
    name: "QueryExecutionRunning",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "QueryRequestCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    name: "QueryRequestDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "startTime",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "endTime",
        type: "uint256",
      },
    ],
    name: "QuestionCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_METAS",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STATS_ANS_SIZE",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        internalType: "einput",
        name: "ans",
        type: "bytes32",
      },
      {
        internalType: "einput[]",
        name: "metaAns",
        type: "bytes32[]",
      },
      {
        internalType: "bytes",
        name: "inputProof",
        type: "bytes",
      },
    ],
    name: "answer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "closeQuestion",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "reqId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "decValid",
        type: "bool",
      },
    ],
    name: "confirmOrRejectAnswer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    name: "deleteQuery",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
      {
        internalType: "uint32",
        name: "steps",
        type: "uint32",
      },
    ],
    name: "executeQuery",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "getAnsLen",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    name: "getQueryRequest",
    outputs: [
      {
        components: [
          {
            internalType: "uint64",
            name: "questionId",
            type: "uint64",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "metaOpt",
                type: "uint8",
              },
              {
                internalType: "enum IAnalytic.PredicateOp",
                name: "op",
                type: "uint8",
              },
              {
                internalType: "uint32",
                name: "metaVal",
                type: "uint32",
              },
            ],
            internalType: "struct IAnalytic.Predicate[]",
            name: "predicates",
            type: "tuple[]",
          },
          {
            internalType: "euint32[]",
            name: "acc",
            type: "uint256[]",
          },
          {
            internalType: "euint32",
            name: "ansCount",
            type: "uint256",
          },
          {
            internalType: "uint32",
            name: "accSteps",
            type: "uint32",
          },
          {
            internalType: "enum IAnalytic.RequestState",
            name: "state",
            type: "uint8",
          },
        ],
        internalType: "struct IAnalytic.QueryRequest",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    name: "getQueryResult",
    outputs: [
      {
        components: [
          {
            internalType: "euint32[]",
            name: "acc",
            type: "uint256[]",
          },
          {
            internalType: "euint32",
            name: "filteredAnsCount",
            type: "uint256",
          },
          {
            internalType: "uint32",
            name: "ttlAnsCount",
            type: "uint32",
          },
        ],
        internalType: "struct IAnalytic.QueryResult",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "getQuestion",
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "string",
                name: "text",
                type: "string",
              },
              {
                internalType: "string[]",
                name: "options",
                type: "string[]",
              },
              {
                internalType: "uint32",
                name: "min",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "max",
                type: "uint32",
              },
              {
                internalType: "enum QuestionSpecLib.QuestionType",
                name: "t",
                type: "uint8",
              },
            ],
            internalType: "struct QuestionSpecLib.QuestionSpec",
            name: "main",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "string",
                name: "text",
                type: "string",
              },
              {
                internalType: "string[]",
                name: "options",
                type: "string[]",
              },
              {
                internalType: "uint32",
                name: "min",
                type: "uint32",
              },
              {
                internalType: "uint32",
                name: "max",
                type: "uint32",
              },
              {
                internalType: "enum QuestionSpecLib.QuestionType",
                name: "t",
                type: "uint8",
              },
            ],
            internalType: "struct QuestionSpecLib.QuestionSpec[]",
            name: "metas",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "startTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "endTime",
            type: "uint256",
          },
          {
            internalType: "enum IAnalytic.QuestionState",
            name: "state",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "queryThreshold",
            type: "uint32",
          },
        ],
        internalType: "struct IAnalytic.Question",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
    ],
    name: "getUserQueryRequestList",
    outputs: [
      {
        internalType: "uint64[]",
        name: "",
        type: "uint64[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasAnswered",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "text",
            type: "string",
          },
          {
            internalType: "string[]",
            name: "options",
            type: "string[]",
          },
          {
            internalType: "uint32",
            name: "min",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "max",
            type: "uint32",
          },
          {
            internalType: "enum QuestionSpecLib.QuestionType",
            name: "t",
            type: "uint8",
          },
        ],
        internalType: "struct QuestionSpecLib.QuestionSpec",
        name: "_main",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "string",
            name: "text",
            type: "string",
          },
          {
            internalType: "string[]",
            name: "options",
            type: "string[]",
          },
          {
            internalType: "uint32",
            name: "min",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "max",
            type: "uint32",
          },
          {
            internalType: "enum QuestionSpecLib.QuestionType",
            name: "t",
            type: "uint8",
          },
        ],
        internalType: "struct QuestionSpecLib.QuestionSpec[]",
        name: "_metas",
        type: "tuple[]",
      },
      {
        internalType: "uint256",
        name: "_startTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_endTime",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "_queryThreshold",
        type: "uint32",
      },
    ],
    name: "newQuestion",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextQueryRequestId",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextQuestionId",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    name: "queryRequests",
    outputs: [
      {
        internalType: "uint64",
        name: "questionId",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "euint32",
        name: "ansCount",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "accSteps",
        type: "uint32",
      },
      {
        internalType: "enum IAnalytic.RequestState",
        name: "state",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "questionAdmins",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "questionAnswers",
    outputs: [
      {
        internalType: "euint32",
        name: "val",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    name: "questions",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "text",
            type: "string",
          },
          {
            internalType: "string[]",
            name: "options",
            type: "string[]",
          },
          {
            internalType: "uint32",
            name: "min",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "max",
            type: "uint32",
          },
          {
            internalType: "enum QuestionSpecLib.QuestionType",
            name: "t",
            type: "uint8",
          },
        ],
        internalType: "struct QuestionSpecLib.QuestionSpec",
        name: "main",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endTime",
        type: "uint256",
      },
      {
        internalType: "enum IAnalytic.QuestionState",
        name: "state",
        type: "uint8",
      },
      {
        internalType: "uint32",
        name: "queryThreshold",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "qId",
        type: "uint64",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "metaOpt",
            type: "uint8",
          },
          {
            internalType: "enum IAnalytic.PredicateOp",
            name: "op",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "metaVal",
            type: "uint32",
          },
        ],
        internalType: "struct IAnalytic.Predicate[]",
        name: "predicates",
        type: "tuple[]",
      },
    ],
    name: "requestQuery",
    outputs: [
      {
        internalType: "uint64",
        name: "reqId",
        type: "uint64",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userQueries",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
