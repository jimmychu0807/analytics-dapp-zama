import { type Abi } from "viem";

export const abi: Abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "InvalidQuestionSpecParam",
    type: "error",
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
            type: "QuestionSpecLib.QuestionType",
          },
        ],
        internalType: "struct QuestionSpecLib.QuestionSpec",
        name: "self",
        type: "tuple",
      },
    ],
    name: "validate",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
] as const;
