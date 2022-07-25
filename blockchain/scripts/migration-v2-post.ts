// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers, upgrades } from "hardhat";

import { Contract, utils } from "ethers";

import { Minter } from "../typechain-types/contracts/minter/Minter";
import { Rewarder } from "../typechain-types/contracts/reward/Rewarder";
import * as deployedAddresses from "../addresses.json";

(async () => {
  try {
    console.log(
      "Deploying all the contract for a simple blockchain intergration"
    );

    // Update our rewarder contract
    const rewarder = await updateContract<Rewarder>(
      "Rewarder",
      deployedAddresses.rewarderAddr
    );
    console.log("Rewarder syb address updated on " + rewarder.address);

    // Update our minter contract
    const minter = await updateContract<Minter>(
      "Minter",
      deployedAddresses.minterAddr
    );
    console.log("Minter syb address updated on " + minter.address);
  } catch (e: any) {
    console.log(e.message);
  }
})();

async function updateContract<Type extends Contract>(
  name: string,
  proxyAddress: string
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  const contract = (await upgrades.upgradeProxy(
    proxyAddress,
    contractFactory
  )) as Type;
  await contract.deployed();
  return contract;
}
