import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const lib = await deploy("QuestionSpecLib", {
    from: deployer,
    log: true,
  });

  const analyticContract = await deploy("Analytic", {
    from: deployer,
    libraries: {
      QuestionSpecLib: lib.address,
    },
    log: true,
  });

  console.log(`QuestionSpecLib contract address: ${lib.address}`);
  console.log(`Analytic contract address:        ${analyticContract.address}`);
};

export default func;
func.id = "deploy_analytic"; // id required to prevent reexecution
func.tags = ["Analytic"];
