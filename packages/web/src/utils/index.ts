// TODO: fix this so it works for reading on different chains
import {
  type QuestionSet,
  type QuestionSpec,
  type Predicate,
  QuestionState,
  QuestionType,
} from "../types";
import { questionSpecLibABI, analyticABI } from "@/abi";
import { DateTime } from "luxon";
import { type Address, formatEther as viemFormatEther } from "viem";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const maxMetas = 4;
export const maxPredicates = 3;
export const querySteps = 5;
export const ethRpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL;
export const mockedHardhat = process.env.NEXT_PUBLIC_MOCKED_HARDHAT === "true";

export const requiredChainId = mockedHardhat ? hardhat.id : sepolia.id;
export const fhevmConfig = {
  kmsContractAddress: "0x9D6891A6240D6130c54ae243d8005063D05fE14b",
  aclContractAddress: "0xFee8407e2f5e3Ee68ad77cAE98c434e637f516e5",
  gatewayUrl: "https://gateway.sepolia.zama.ai/",
};
export const explorerPrefix = "https://sepolia.etherscan.io/";

export const projectInfo = {
  src: "https://github.com/jimmychu0807/analytics-dapp-zama",
  blog: "http://jimmychu0807.hk/analytics-dapp-zama",
  video: "",
};

export const questionSpecLib = {
  address: (process.env.NEXT_PUBLIC_QUESTIONSPECLIB_ADDRESS ?? "0x") as Address,
  abi: questionSpecLibABI,
} as const;

export const analyticContract = {
  address: (process.env.NEXT_PUBLIC_ANALYTIC_ADDRESS ?? "0x") as Address,
  abi: analyticABI,
} as const;

export function getConfig() {
  return createConfig({
    chains: [hardhat, sepolia],
    connectors: [injected()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [hardhat.id]: http(ethRpcUrl),
      [sepolia.id]: http(ethRpcUrl),
    },
  });
}

export function formatEther(value: bigint, decimal: number = 3): string {
  return Number(viemFormatEther(value)).toFixed(decimal).toString();
}

export function formatDatetime(timestamp: number): string {
  const dt = DateTime.fromMillis(timestamp * 1000);
  return dt.toFormat("yyyy-MM-dd HH:mm");
}

export function formatPercent(num: bigint | number, denom: bigint | number): string {
  const ans = ((Number(num) * 100) / Number(denom)).toFixed(3);
  return `${ans}%`;
}

export function formatNumber(num: bigint | number): string {
  const toNum = Number(num);
  if (Number.isInteger(toNum)) return toNum.toLocaleString();

  return toNum.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function clientQuestionState(question: QuestionSet): QuestionState {
  if (question.state === QuestionState.Closed) return QuestionState.Closed;

  const now = Math.round(Date.now() / 1000);
  if (now < Number(question.startTime)) return QuestionState.Initialized;
  if (now >= Number(question.endTime)) return QuestionState.Closed;
  return QuestionState.Open;
}

export function parseFormDataIntoAnswerData(formData: FormData) {
  const metaAns = [] as Array<number>;
  let ans: number | undefined = undefined;

  for (const [name, val] of formData.entries()) {
    if (name === "main") {
      ans = Number(val);
    } else if (name.startsWith("meta")) {
      metaAns.push(Number(val));
    }
  }

  if (ans === undefined) throw new Error("main answer does not exist!");

  return { ans, metaAns };
}

export function parseFormDataIntoQueryRequestObj(formData: FormData) {
  const predicates: Array<Record<string, number>> = [];
  for (const [key, val] of formData.entries()) {
    const matches = key.match(/predicate(\d+)-(.*)/);

    if (!matches || matches.length < 3) continue;

    const idx = Number(matches[1]);
    if (predicates.length <= idx) predicates.push({});
    predicates[idx][matches[2]] = Number(val);
  }

  return predicates as unknown as Array<Predicate>;
}

export function parseFormDataIntoQuestionData(formData: FormData) {
  const questionSpecs: Record<string, QuestionSpec> = {};

  // only process those start from main-* or criteria-*
  for (const [name, val] of formData.entries()) {
    const hyphenPos = name.indexOf("-");
    if (hyphenPos < 0) continue;

    // remove empty string
    const valStr = (val as string).trim();
    if (valStr.length === 0) continue;

    const prefix = name.slice(0, hyphenPos);
    const suffix = name.slice(hyphenPos + 1);

    if (suffix === "qText") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        text: valStr,
      };
    } else if (suffix === "type") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        t: valStr === "option" ? QuestionType.Option : QuestionType.Value,
      };
    } else if (suffix === "min") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        min: Number(valStr),
      };
    } else if (suffix === "max") {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        max: Number(valStr),
      };
    } else if (suffix.startsWith("option")) {
      questionSpecs[prefix] = {
        ...questionSpecs[prefix],
        options:
          questionSpecs[prefix].options !== undefined
            ? [...questionSpecs[prefix].options, valStr as string]
            : [valStr as string],
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

  const startTime = Date.parse((formData.get("start-datetime") ?? "") as string) / 1000;
  const endTime = Date.parse((formData.get("end-datetime") ?? "") as string) / 1000;
  const queryThreshold = Number(formData.get("query-threshold"));

  return {
    main: questionSpecs["main"],
    metas,
    startTime,
    endTime,
    queryThreshold,
  };
}
