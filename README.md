
# Sybel.io

The Sybel Ecosystem is build to align interests of Creators and their Community in order to reinvent the IP monetization market. Creators mint their Work as a NFT and can fractionalize it in different rarity tokens to offer their community the opportunity to buy some shares, in exchange for profits, rewards or even governance rights. 
Then, when a User interact (listen, watch, read...) with content, on the platform of their choice, Creators earn tokens (TSE) that they share with Users. Several interactions can make Users reach the next level to get special NFT.Creators mint their Work as a NFT and fractionalize it to offer their community the opportunity to buy some shares, in exchange for profits, rewards or even governance rights (micro DAO). 
Creators’ and Users’ TSE earnings are stored in the in-app custodial Wallet created for them. Custodial Wallets have a built-in Swap function.

## Our Vision

Our vision is to give Creators the rightful place they deserve in society. The value has to be shared equally between those who create, those who fund and those who consume content. By empowering all these people to govern and to be rewarded for the value they create, whether that be through work, investment or engagement, the Sybel ecosystem believes that Web3 is the ideal way to make that happens.

## Pushing decentralization even further

The core of the reactor of Sybel Web3 version is based on three pillars: 
- A utility token ($TSE) that allows Creators and Users to be rewarded for their work and commitment.
- A governance token ($SMT) that allows Creators and Users to vote for some decisions and can be traded with other cryptocurrencies 
- The possibility for Creators to mint NFTs (ERC 1155) from their work and financialize them. For example through fractionalizing the NFT into shares that users can buy in exchange for future revenues and rights. As a result each user is able to own a share of the Creator’s work which confers to them both economic and democratic rights (see below).

## Build

#### Required tools

To build this project you need to have

 - npm
 - firebase tools
 - hardhat 

### Firebase functions

To test the firebase function locally : 

1. Go to the functions folder (`cd functions`)
2. Install the required dependencies (`npm i`)
3. Import the addresses on which you want to build the project (`cp ../blockchain/addresses-mumbai.json src/utils/addresses.json`)
4. Generate smart contract TS typing (in the functions folder : `npm run generate-types`) 
5. Build the project (`npm run build`)
6. Start the emulator (`firebase emulators:start`)

### Smart contracts

To test the smart contract locally : 

1. Go to the blockchain folder (`cd functions`)
2. Install the required dependencies (`npm i`)
3. Build the smart contract (`npx hardhat compile`)
4. In another terminal,  run a local hardhat node (`npx hardhat node`)
5. Finally, deploy the contracts (`npx hardhat run --network localhost scripts/deploy.ts`)
6. Then you're good to start playing with them

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

