import { Wallet, ZeroAddress } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  ACL_ADDRESS,
  FHEPAYMENT_ADDRESS,
  GATEWAYCONTRACT_ADDRESS,
  INPUTVERIFIER_ADDRESS,
  KMSVERIFIER_ADDRESS,
  PRIVATE_KEY_KMS_SIGNER,
  TFHEEXECUTOR_ADDRESS,
} from "./constants";

const OneAddress = "0x0000000000000000000000000000000000000001";

type objWithInitializeFunc = {
  initialize: (a1: string) => Promise<unknown>;
};

type objWithAddSignerFunc = {
  addSigner: (w: Wallet) => Promise<unknown>;
};

type objWithAddRelayerFunc = {
  addRelayer: (s1: string) => Promise<unknown>;
};

export async function setCodeMocked(hre: HardhatRuntimeEnvironment) {
  const aclArtifact = await import("fhevm-core-contracts/artifacts/contracts/ACL.sol/ACL.json");
  const aclBytecode = aclArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [ACL_ADDRESS, aclBytecode]);
  const execArtifact = await import(
    "fhevm-core-contracts/artifacts/contracts/TFHEExecutorWithEvents.sol/TFHEExecutorWithEvents.json"
  );
  const execBytecode = execArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [TFHEEXECUTOR_ADDRESS, execBytecode]);
  const kmsArtifact = await import("fhevm-core-contracts/artifacts/contracts/KMSVerifier.sol/KMSVerifier.json");
  const kmsBytecode = kmsArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [KMSVERIFIER_ADDRESS, kmsBytecode]);
  const inputArtifact = await import(
    "fhevm-core-contracts/artifacts/contracts/InputVerifier.coprocessor.sol/InputVerifier.json"
  );
  const inputBytecode = inputArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [INPUTVERIFIER_ADDRESS, inputBytecode]);
  const fhepaymentArtifact = await import("fhevm-core-contracts/artifacts/contracts/FHEPayment.sol/FHEPayment.json");
  const fhepaymentBytecode = fhepaymentArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [FHEPAYMENT_ADDRESS, fhepaymentBytecode]);
  const gatewayArtifact = await import(
    "fhevm-core-contracts/artifacts/gateway/GatewayContract.sol/GatewayContract.json"
  );
  const gatewayBytecode = gatewayArtifact.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [GATEWAYCONTRACT_ADDRESS, gatewayBytecode]);
  const zero = await impersonateAddress(hre, ZeroAddress, hre.ethers.parseEther("100"));
  const one = await impersonateAddress(hre, OneAddress, hre.ethers.parseEther("100"));
  const kmsSigner = new hre.ethers.Wallet(PRIVATE_KEY_KMS_SIGNER);
  const kms = await hre.ethers.getContractAt(kmsArtifact.abi, KMSVERIFIER_ADDRESS);

  await (kms.connect(zero) as unknown as objWithInitializeFunc).initialize(OneAddress);
  await (kms.connect(one) as unknown as objWithAddSignerFunc).addSigner(kmsSigner);

  const input = await hre.ethers.getContractAt(inputArtifact.abi, INPUTVERIFIER_ADDRESS);
  await (input.connect(zero) as unknown as objWithInitializeFunc).initialize(OneAddress);

  const gateway = await hre.ethers.getContractAt(gatewayArtifact.abi, GATEWAYCONTRACT_ADDRESS);
  await (gateway.connect(zero) as unknown as objWithAddRelayerFunc).addRelayer(ZeroAddress);
}

export async function impersonateAddress(hre: HardhatRuntimeEnvironment, address: string, amount: bigint) {
  // for mocked mode
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  await hre.network.provider.send("hardhat_setBalance", [address, hre.ethers.toBeHex(amount)]);
  const impersonatedSigner = await hre.ethers.getSigner(address);
  return impersonatedSigner;
}
