import dotenv from "dotenv";
import { type TransactionReceipt, hexlify } from "ethers";
import { task, types } from "hardhat/config";
import { type HardhatRuntimeEnvironment } from "hardhat/types";

import AnalyticJSON from "../artifacts/contracts/Analytic.sol/Analytic.json";
import { getMockedFhevm } from "../mockedServices/client";
import { newQuestionSpec } from "../test/analytic/helpers";

dotenv.config();

const AnalyticContract = {
  address: process.env.NEXT_PUBLIC_ANALYTIC_ADDRESS || "",
  abi: AnalyticJSON.abi,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const questions: Record<string, any> = {
  "simple": {
    main: newQuestionSpec("Which L2 chains do you use most?", {
      options: ["OP Mainnet", "Base", "Arbitrum One", "ZKsync Era"],
    }),
    metas: []
  },
  "l2-usage": {
    main: newQuestionSpec("Which L2 chains do you use most?", {
      options: ["OP Mainnet", "Base", "Arbitrum One", "ZKsync Era"],
    }),
    metas: [
      newQuestionSpec("Your gender", { options: ["Male", "Female"] }),
      newQuestionSpec("Your age", { min: 18, max: 150 }),
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const answers: Record<string, any> = {
  "simple": [
    [0], [0], [1], [2], [3],
    [0], [0], [1], [2], [3],
  ],
  "l2-usage": [
    [0, 0, 20],
    [1, 1, 30],
    [2, 1, 40],
    [0, 0, 25],
    [0, 1, 35],
  ],
};

task("analytics:new-question", "Load a new question to the Analytic contract")
  .addParam("type", "Question type (l2-usage)", "l2-usage", types.string)
  .setAction(async ({ type }, hre) => {
    if (!questions[type]) throw new Error("Question type does not exist.");

    console.log(`loading question type: ${type}`);
    const { main, metas } = questions[type];

    const [alice] = await hre.ethers.getSigners();
    const analyticContract = await hre.ethers.getContractAt("Analytic", AnalyticContract.address, alice);

    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 60 * 60 * 24; // end in 24 hours
    const queryThreshold = 2;

    const tx = await analyticContract.newQuestion(main, metas, currentTS, endTS, queryThreshold);
    const receipt = await tx.wait();

    parseReceiptEvents(receipt!, hre);
  });

task("analytics:answer", "Answer a particular question")
  .addPositionalParam("qId", "Question ID", 0, types.int)
  .addParam("type", "question type", "l2-usage", types.string)
  .addParam("start", "start index of answer fixtures", 0, types.int)
  .addParam("num", "number of answers", 1, types.int)
  .setAction(async ({ qId, type, start, num }, hre) => {
    if (!answers[type]) throw new Error("Answer type does not exist.");
    if (num < 1) throw new Error("parameter `num` has to be greater than 0");

    const analyticContract = await hre.ethers.getContractAt("Analytic", AnalyticContract.address);

    const signers = (await hre.ethers.getSigners()).slice(start, start + num);
    const signerAddrs = await Promise.all(signers.map((s) => s.getAddress()));

    const fhevm = getMockedFhevm();
    const loadedAns = answers[type].slice(start, start + num);

    for (let idx = 0; idx < loadedAns.length; idx++) {
      const ans = loadedAns[idx];
      const signer = signers[idx];
      const signerAddr = signerAddrs[idx];
      const input = fhevm.createEncryptedInput(AnalyticContract.address, signerAddr);
      const inputs = await ans.reduce((acc: typeof input, val: number) => acc.add32(val), input).encrypt();

      const inputStrs = {
        handles: inputs.handles.map((h: Uint8Array) => hexlify(h)),
        inputProof: inputs.inputProof,
      };

      const tx = await analyticContract
        .connect(signer)
        .answer(qId, inputStrs.handles[0], inputStrs.handles.slice(1), inputStrs.inputProof);
      const receipt = await tx.wait();

      console.log(`submitted ${idx + 1}/${loadedAns.length}`)
      parseReceiptEvents(receipt!, hre);

      // sleep before running the next iteration
      if (idx !== loadedAns.length - 1) await sleep(600);
    }
  });

task("analytics:read", "Perform read action on Analytic contract")
  .addPositionalParam("func", "The read function name")
  .addPositionalParam("params", "parameters")
  .setAction(async ({ func, params }, hre) => {
    const signer = (await hre.ethers.getSigners())[0];
    const analyticContract = await hre.ethers.getContractAt("Analytic", AnalyticContract.address);

    if (!func || func.trim().length === 0) throw Error("read function is not defined");
    const paramObj = params ? JSON.parse(params) : [];

    // @ts-expect-error: figure out correct types for dynamically calling the smart contract function
    const result = await analyticContract.connect(signer)[func as string](...paramObj);

    console.log(result);
  });

function parseReceiptEvents(receipt: TransactionReceipt, hre: HardhatRuntimeEnvironment, bPrint: boolean = true) {
  const events = [];
  const iface = new hre.ethers.Interface(AnalyticContract.abi);

  for (const log of receipt.logs) {
    const event = iface.parseLog(log);
    if (event) events.push(event);
  }

  if (bPrint) {
    events.forEach((ev) => console.log(`${ev.name}`, ev.args));
  }

  return events;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
