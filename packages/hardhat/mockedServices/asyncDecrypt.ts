// @ts-nocheck
import { Wallet, ZeroAddress } from "ethers";
import { ethers } from "ethers";
import aclArtifact from "fhevm-core-contracts/artifacts/contracts/ACL.sol/ACL.json";
import gatewayArtifact from "fhevm-core-contracts/artifacts/gateway/GatewayContract.sol/GatewayContract.json";

import { ACL_ADDRESS, GATEWAYCONTRACT_ADDRESS, KMSVERIFIER_ADDRESS, PRIVATE_KEY_KMS_SIGNER } from "../test/constants";
import { awaitCoprocessor, getClearText } from "./coprocessorUtils";
import { HARDHAT_ENDPOINT } from "./server";

const aclAdd = ACL_ADDRESS;

const CiphertextType = {
  0: "bool",
  1: "uint8", // corresponding to euint4
  2: "uint8", // corresponding to euint8
  3: "uint16",
  4: "uint32",
  5: "uint64",
  6: "uint128",
  7: "address",
  8: "uint256",
  9: "bytes",
  10: "bytes",
  11: "bytes",
};

export const currentTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "numeric", second: "numeric" });
};

// const argEvents =
//   "(uint256 indexed requestID, uint256[] cts, address contractCaller, bytes4 callbackSelector, uint256 msgValue, uint256 maxTimestamp, bool passSignaturesToCaller)";
// const ifaceEventDecryption = new ethers.Interface(["event EventDecryption" + argEvents]);

let provider = undefined;
let acl = undefined;
let gateway = undefined;

export const initGateway = async (): Promise<void> => {
  provider = new ethers.WebSocketProvider(HARDHAT_ENDPOINT);
  acl = new ethers.Contract(ACL_ADDRESS, aclArtifact.abi, provider);
  gateway = new ethers.Contract(GATEWAYCONTRACT_ADDRESS, gatewayArtifact.abi, provider);

  gateway.on("EventDecryption", async (requestID, cts) => {
    console.log(`${currentTime()}: (event) Request decrypt (requestID: ${requestID}) for handles ${cts}`);
    await fulfillRequest(requestID, cts);
  });

  gateway.on("ResultCallback", async (requestID, success, result, eventData) => {
    const blockNumber = eventData.log.blockNumber;
    console.log(`${currentTime()}: (event) Fulfill decrypt (requestID: ${requestID}) on block ${blockNumber}`);
  });
};

const allTrue = (arr: boolean[], fn = Boolean) => arr.every(fn);
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const fulfillRequest = async (requestID: bigint, handles: bigint[]) => {
  console.log(`${currentTime()}: fulfillRequest(requestID: ${requestID}) called`);

  try {
    await awaitCoprocessor();

    const typesList = handles.map((handle) => parseInt(handle.toString(16).slice(-4, -2), 16));
    const isAllowedForDec = await Promise.all(handles.map(async (handle) => acl.isAllowedForDecryption(handle)));
    if (!allTrue(isAllowedForDec)) {
      throw new Error("Some handle is not authorized for decryption");
    }

    const types = typesList.map((num) => CiphertextType[num]);
    const values = await Promise.all(handles.map(async (handle) => BigInt(await getClearText(handle))));
    const valuesFormatted = values.map((value, index) =>
      types[index] === "address" ? "0x" + value.toString(16).padStart(40, "0") : value,
    );
    const valuesFormatted2 = valuesFormatted.map((value, index) =>
      typesList[index] === 9 ? "0x" + value.toString(16).padStart(128, "0") : value,
    );
    const valuesFormatted3 = valuesFormatted2.map((value, index) =>
      typesList[index] === 10 ? "0x" + value.toString(16).padStart(256, "0") : value,
    );
    const valuesFormatted4 = valuesFormatted3.map((value, index) =>
      typesList[index] === 11 ? "0x" + value.toString(16).padStart(512, "0") : value,
    );

    const abiCoder = new ethers.AbiCoder();
    const encodedData = abiCoder.encode(["uint256", ...types], [31, ...valuesFormatted4]); // 31 is just a dummy uint256 requestID to get correct abi encoding for the remaining arguments (i.e everything except the requestID)
    const calldata = "0x" + encodedData.slice(66); // we just pop the dummy requestID to get the correct value to pass for `decryptedCts`

    const numSigners = 1; // for the moment mocked mode only uses 1 signer
    const decryptResultsEIP712signatures = await computeDecryptSignatures(handles, calldata, numSigners);

    await provider.send("hardhat_impersonateAccount", [ZeroAddress]);
    const impersonatedSigner = new ethers.JsonRpcSigner(provider, ZeroAddress);

    const tx = await gateway
      .connect(impersonatedSigner)
      .fulfillRequest(requestID, calldata, decryptResultsEIP712signatures);

    // note: Manually mine blocks in hardhat node until the transaction is included
    await sleep(300);
    while ((await tx.confirmations()) < 1) {
      await provider.send("evm_mine");
      await sleep(300);
    }

    await provider.send("hardhat_stopImpersonatingAccount", [ZeroAddress]);

    const blockNumber = await provider.send("eth_blockNumber", []);
    console.log(
      `${currentTime()}: fulfillRequest(requestID: ${requestID}) completed. Gateway sent decryption result in callback tx succesfully on block ${parseInt(
        blockNumber,
      )}`,
    );
  } catch (err) {
    console.error(`${currentTime()}: fulfillRequest() error:`, err);
  }
};

async function computeDecryptSignatures(
  handlesList: bigint[],
  decryptedResult: string,
  numSigners: number,
): Promise<string[]> {
  const signatures: string[] = [];

  for (let idx = 0; idx < numSigners; idx++) {
    const privKeySigner = PRIVATE_KEY_KMS_SIGNER;
    if (privKeySigner) {
      const kmsSigner = new ethers.Wallet(privKeySigner).connect(provider);
      const signature = await kmsSign(handlesList, decryptedResult, kmsSigner);
      signatures.push(signature);
    } else {
      throw new Error(`Private key for signer ${idx} not found in environment variables`);
    }
  }
  return signatures;
}

async function kmsSign(handlesList: bigint[], decryptedResult: string, kmsSigner: Wallet) {
  const kmsAdd = KMSVERIFIER_ADDRESS;
  const chainId = (await provider.getNetwork()).chainId;

  const domain = {
    name: "KMSVerifier",
    version: "1",
    chainId: chainId,
    verifyingContract: kmsAdd,
  };

  const types = {
    DecryptionResult: [
      {
        name: "aclAddress",
        type: "address",
      },
      {
        name: "handlesList",
        type: "uint256[]",
      },
      {
        name: "decryptedResult",
        type: "bytes",
      },
    ],
  };
  const message = {
    aclAddress: aclAdd,
    handlesList: handlesList,
    decryptedResult: decryptedResult,
  };

  const signature = await kmsSigner.signTypedData(domain, types, message);
  const sigRSV = ethers.Signature.from(signature);
  const v = 27 + sigRSV.yParity;
  const r = sigRSV.r;
  const s = sigRSV.s;

  const result = r + s.substring(2) + v.toString(16);
  return result;
}
