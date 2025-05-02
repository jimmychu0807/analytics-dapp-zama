import { type Abi, type Address, formatEther as viemFormatEther } from "viem";
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { sepolia, localhost } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { DateTime } from "luxon";

// TODO: fix this so it works for reading on different chains
import deployment from "@/deployment/localhost.json";
import {
  QuestionType,
  QuestionState,
  type QuestionSpec,
  type QuestionSet,
} from "../types";

export const MAX_METAS = 4;
export const ethRpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL;

// TODO: fix this for sepolia
export const REQUIRED_CHAIN_ID = Number(deployment.chainId);
export const DEPLOYMENT = process.env.NEXT_PUBLIC_DEPLOYMENT;

const { contracts } = deployment;
export const questionSpecLib = {
  address: contracts.QuestionSpecLib.address as Address,
  abi: contracts.QuestionSpecLib.abi as Abi,
} as const;

export const analyticContract = {
  address: contracts.Analytic.address as Address,
  abi: contracts.Analytic.abi as Abi,
} as const;

export function getConfig() {
  return createConfig({
    chains: [localhost, sepolia],
    connectors: [injected()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [localhost.id]: http(ethRpcUrl),
      [sepolia.id]: http(ethRpcUrl),
    },
  });
}

export function formatEther(value: bigint, decimal: number = 3): string {
  return Number(viemFormatEther(value)).toFixed(decimal).toString();
}

export function formatDatetime(timestamp: number): string {
  const dt = DateTime.fromMillis(timestamp * 1000);
  return dt.toFormat("yyyy-MM-dd hh:mm");
}

export function clientQuestionState(question: QuestionSet): QuestionState {
  if (question.state === QuestionState.Closed) return QuestionState.Closed;

  const now = Math.round(Date.now() / 1000);
  if (now < Number(question.startTime)) return QuestionState.Initialized;
  if (now >= Number(question.endTime)) return QuestionState.Closed;
  return QuestionState.Open;
}

export function parseFormDataIntoQuestionData(formData: FormData) {
  const questionSpecs: Record<string, QuestionSpec> = {};

  // only process those start from main-* or criteria-*
  for (const [name, val] of formData.entries()) {
    const hyphenPos = name.indexOf("-");
    if (hyphenPos < 0) continue;

    const prefix = name.slice(0, hyphenPos);
    const suffix = name.slice(hyphenPos + 1);

    if (suffix === "qText") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        text: val as string,
      };
    } else if (suffix === "type") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        t: val === "count" ? QuestionType.Option : QuestionType.Value,
      };
    } else if (suffix === "min") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        min: Number(val),
      };
    } else if (suffix === "max") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        max: Number(val),
      };
    } else if (suffix.startsWith("option")) {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        options:
          questionSpecs[prefix].options !== undefined
            ? [...questionSpecs[prefix].options, val as string]
            : [val as string],
      };
    }
  }

  // go thru the second iteration, and put those start with criteria* into meta array
  const metas = [];
  for (const [name, questionSpec] of Object.entries(questionSpecs)) {
    if (questionSpec["t"] === QuestionType.Option) {
      questionSpec["min"] = 0;
      questionSpec["max"] = questionSpec.options.length - 1;
    } else if (questionSpec["t"] === QuestionType.Value) {
      questionSpec["options"] = [];
    }

    if (name.startsWith("criteria")) {
      metas.push(questionSpec);
    }
  }

  const startTime =
    Date.parse((formData.get("start-datetime") ?? "") as string) / 1000;
  const endTime =
    Date.parse((formData.get("end-datetime") ?? "") as string) / 1000;
  const queryThreshold = Number(formData.get("query-threshold"));

  return {
    main: questionSpecs["main"],
    metas,
    startTime,
    endTime,
    queryThreshold,
  };
}
