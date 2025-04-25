import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const lib = await deploy('QuestionSpecLib', {
    from: deployer,
    log: true,
  });

  const analyticContract = await deploy('Analytic', {
    from: deployer,
    libraries: {
      QuestionSpecLib: lib.address
    },
    log: true,
  })

};

export default func;
func.id = "deploy_analytic"; // id required to prevent reexecution
func.tags = ["Analytic"];
