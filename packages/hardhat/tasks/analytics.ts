import dotenv from "dotenv";
import { createEIP712, generateKeypair } from "fhevmjs/node";
import { task, types } from "hardhat/config";

import { newQuestionSpec } from "../test/analytic/helpers";

dotenv.config();

const analyticAddress = process.env.NEXT_PUBLIC_ANALYTIC_ADDRESS || "";

const questions = {
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

const answers = {
  "l2-usage": [
    [0, 0, 20],
    [1, 1, 30],
    [2, 1, 40],
    [0, 0, 25],
    [0, 1, 35],
  ],
};

task("load-question", "Load a question to the Analytic contract")
  .addParam("type", "Question type (l2-usage)", "l2-usage", types.string)
  .setAction(async ({ type }, hre) => {
    if (!questions[type]) throw new Error("Question type does not exist.");

    console.log(`loading question type: ${type}`);
    const { main, metas } = questions[type];

    const [alice] = await hre.ethers.getSigners();
    const analyticContract = await hre.ethers.getContractAt("Analytic", analyticAddress, alice);

    const currentTS = Math.floor(Date.now() / 1000);
    const endTS = currentTS + 60 * 60 * 24; // end in 24 hours
    const queryThreshold = 2;

    const tx = await analyticContract.newQuestion(main, metas, currentTS, endTS, queryThreshold);
    const receipt = await tx.wait();

    console.log(`question ${type} loaded with receipt`, receipt);
  });

task("answer", "Answer questions")
  .addParam("qId", "Question ID", 0, types.int)
  .addParam("type", "question type", "l2-usage", types.string)
  .addParam("ansNum", "Number of answers to make", 1, types.int)
  .setAction(async ({ qId, type, ansNum }, hre) => {
    if (!answers[type]) throw new Error("Answer type does not exist.");

    const analyticContract = await hre.ethers.getContractAt("Analytic", analyticAddress);

    const signers = (await hre.ethers.getSigners()).slice(0, ansNum);
    const signerAddrs = await Promise.all(signers.map((s) => s.getAddress()));

    const fhevm = await createMockInstance();
    const loadedAns = answers[type].slice(0, ansNum);

    for (let idx = 0; idx < ansNum; idx++) {
      const ans = loadedAns[idx];
      const signer = signers[idx];
      const signerAddr = signerAddrs[idx];
      const input = fhevm.createEncryptedInput(analyticAddress, signerAddr);
      const inputs = await ans.reduce((acc, val) => acc.add32(val), input).encrypt();

      const tx = await analyticContract
        .connect(signer)
        .answer(qId, inputs.handles[0], inputs.handles.slice(1), inputs.inputProof);
      const receipt = await tx.wait();

      console.log("receipt:", receipt);
    }
  });

task("readAnalytics", "Perform read action on Analytic contract")
  .addParam("signerIdx", "the signer index", 0, types.int)
  .addParam("func", "The function name")
  .addParam("params", "parameters")
  .setAction(async ({ func, params }, hre) => {
    // const analyticContract = await hre.ethers.getContractAt("Analytic", analyticAddress);
    const signer = (await hre.ethers.getSigners())[0];
    const signerAddr = await signer.getAddress();

    console.log(signerAddr, func, params);
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
