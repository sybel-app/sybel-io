// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Contract } from "ethers";

import { TokenSybelEcosystem } from "../../typechain-types/contracts/tokens/TokenSybelEcosystem";
import { rewarderAddr, updaterAddr, minterAddr } from "../../addresses.json";
import { SybelInternalTokens } from "../../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../../typechain-types/contracts/tokens/SybelMediaToken";
import { Rewarder } from "../../typechain-types/contracts/reward/Rewarder";
import { Minter } from "../../typechain-types/contracts/minter/Minter";
import { Updater } from "../../typechain-types/contracts/updater/Updater";

(async () => {
  try {
    console.log("Pausing all the entry points contract");

    // Find the contract we want to pause
    const rewarder = await findContract<Rewarder>("Rewarder", rewarderAddr);
    const minter = await findContract<Minter>("Minter", minterAddr);
    const updater = await findContract<Updater>("Updater", updaterAddr);

    // Pause each one of them
    await rewarder.pause();
    await minter.pause();
    await updater.pause();
  } catch (e: any) {
    console.log(e.message);
  }
})();

async function findContract<Type extends Contract>(
  name: string,
  address: string
): Promise<Type> {
  const contractFactory = await ethers.getContractFactory(name);
  return contractFactory.attach(address) as Type;
}
