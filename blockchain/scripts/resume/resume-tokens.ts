// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { Contract } from "ethers";

import { TokenSybelEcosystem } from "../../typechain-types/contracts/tokens/TokenSybelEcosystem";
import {
  tseTokenAddr,
  smtTokenAddr,
  internalTokenAddr,
} from "../../addresses.json";
import { SybelInternalTokens } from "../../typechain-types/contracts/tokens/SybelInternalTokens";
import { SybelMediaToken } from "../../typechain-types/contracts/tokens/SybelMediaToken";

(async () => {
  try {
    console.log("Resuming all the tokens contract");

    // Find the contract we want to resume
    const tseToken = await findContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem",
      tseTokenAddr
    );
    const internalToken = await findContract<SybelInternalTokens>(
      "SybelInternalTokens",
      internalTokenAddr
    );
    const smtToken = await findContract<SybelMediaToken>(
      "SybelMediaToken",
      smtTokenAddr
    );

    // Resume each one of them
    await tseToken.unpause();
    await internalToken.unpause();
    await smtToken.unpause();
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
