// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
import { ethers } from "hardhat";

import { BigNumber, Contract } from "ethers";

const hre = require("hardhat");

import { Minter } from "../typechain-types/contracts/minter/Minter";
import { TokenSybelEcosystem } from "../typechain-types/contracts/tokens/TokenSybelEcosystem";

import { minterAddr, tseTokenAddr } from "../addresses.json";

(async () => {
  try {
    console.log("Minting some podcast fraction");

    // Find our minter contract and our tse contracts
    const minter = await findContract<Minter>("Minter", minterAddr);
    const tseContract = await findContract<TokenSybelEcosystem>(
      "TokenSybelEcosystem",
      tseTokenAddr
    );

    // Get the 5 first accounts
    const accounts = (await hre.ethers.getSigners()).slice(0, 5);

    // Get the last minted podcast id
    const podcastMintEventFilter = minter.filters.PodcastMinted();
    const podcastMintedEvents = await minter.queryFilter(
      podcastMintEventFilter
    );
    const podcastIds = podcastMintedEvents.map((podcastMintedEvent) => {
      return podcastMintedEvent.args.baseId;
    });
    for (const podcastId of podcastIds) {
      const fractionId = podcastId.shl(4).or(BigNumber.from(3));
      // Mint a classic fraction per account on the first minted podcast
      for (const account of accounts) {
        // Give the user 10 TSE
        await tseContract.mint(account.address, 100 * 10e6);
        // Mint some fraction
        await minter.mintFraction(fractionId, account.address, 1);
        console.log(
          "New fraction of podcast minted for the user " +
            account.address +
            " on fraction " +
            fractionId
        );
      }
    }
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
