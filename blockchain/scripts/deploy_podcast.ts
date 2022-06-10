// This script can be used to deploy the "PodcastHandler" contract using Web3 library.
const hre = require("hardhat");

(async () => {
  try {
    console.log("Deploying podcast handler contract");
    // We get the contract to deploy
    const PodcastHandler = await hre.ethers.getContractFactory(
      "PodcastHandler"
    );
    const podcastHandler = await PodcastHandler.deploy();

    await podcastHandler.deployed();

    console.log("Podcast handler deployed to:", podcastHandler.address);
  } catch (e: any) {
    console.log(e.message);
  }
})();
