import dotenv from "dotenv";
import { createEIP712, generateKeypair } from "fhevmjs/node";
import { task, types } from "hardhat/config";
import { type HardhatRuntimeEnvironment } from "hardhat/types";
import AnalyticJSON from "../artifacts/contracts/Analytic.sol/Analytic.json";
import { type TransactionReceipt, hexlify } from "ethers";

import { newQuestionSpec } from "../test/analytic/helpers";

dotenv.config();

const AnalyticContract = {
  address: process.env.NEXT_PUBLIC_ANALYTIC_ADDRESS || "",
  abi: AnalyticJSON.abi,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const questions: Record<string, any> = {
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

    const events = parseReceiptEvents(receipt!, hre);
    events.forEach(ev => console.log(`${ev.name}`, ev.args));
  });

task("analytics:answer", "Answer a particular question")
  .addParam("qId", "Question ID", 0, types.int)
  .addParam("type", "question type", "l2-usage", types.string)
  .addParam("ansStartIdx", "start index of answer fixtures", 0, types.int)
  .addParam("ansNum", "number of answers", 1, types.int)
  .setAction(async ({ qId, type, ansStartIdx, ansNum }, hre) => {
    if (!answers[type]) throw new Error("Answer type does not exist.");

    const analyticContract = await hre.ethers.getContractAt("Analytic", AnalyticContract.address);

    const signers = (await hre.ethers.getSigners()).slice(ansStartIdx, ansNum);
    const signerAddrs = await Promise.all(signers.map((s) => s.getAddress()));

    const fhevm = await createMockInstance();
    const loadedAns = answers[type].slice(ansStartIdx, ansNum);

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

      const events = parseReceiptEvents(receipt!, hre);
      events.forEach(ev => console.log(`${ev.name}`, ev.args));
    }
  });

task("analytics:read", "Perform read action on Analytic contract")
  .addParam("func", "The function name")
  .addParam("params", "parameters")
  .setAction(async ({ func, params }, hre) => {
    // const analyticContract = await hre.ethers.getContractAt("Analytic", analyticAddress);
    const signer = (await hre.ethers.getSigners())[0];
    const analyticContract = await hre.ethers.getContractAt("Analytic", AnalyticContract.address);
    const paramObj = JSON.parse(params);
    const result = await analyticContract.connect(signer)[func](...paramObj);

    console.log(result);
  });

async function createMockInstance() {
  const { createEncryptedInputMocked, reencryptRequestMocked } = await import("../test/fhevmjsMocked");
  const instance = {
    reencrypt: reencryptRequestMocked,
    createEncryptedInput: createEncryptedInputMocked,
    getPublicKey: () => "0xFFAA44433",
    generateKeypair: generateKeypair,
    createEIP712: createEIP712(31337),
  };

  return instance;
}

function parseReceiptEvents(receipt: TransactionReceipt, hre: HardhatRuntimeEnvironment) {
  const events = [];
  const iface = new hre.ethers.Interface(AnalyticContract.abi);

  for (const log of receipt.logs) {
    const event = iface.parseLog(log);
    if (event) events.push(event);
  }
  return events;
}
