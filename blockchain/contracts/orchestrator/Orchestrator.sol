// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IOrchestrator.sol";
import "../utils/pausable/OwnerPausable.sol";
import "../reward/IRewarder.sol";
import "../reward/Rewarder.sol";
import "../minter/IMinter.sol";
import "../minter/Minter.sol";
import "../updater/IUpdater.sol";
import "../updater/Updater.sol";
import "../tokens/InternalTokens.sol";
import "../badges/payment/IListenerBadges.sol";
import "../badges/payment/IPodcastBadges.sol";
import "../badges/payment/ListenerBadges.sol";
import "../badges/payment/PodcastBadges.sol";
import "hardhat/console.sol";

/**
 * @dev Represent our orchestrator contract, reponsable for global address updating, global pausing etc


----

 - Orchestrator handle initial badges creation
 - Handle rewarder contract update (so update from internal tokens ???)
 - Rewarder contract take as param listener and podcaster badges
    - Is created from orchestrator ? And then can be updated indenpendantly ???



Bricks : 
    - Governance tokens -> ERC20
    - Internal tokens -> ERC1155 -> Call rewarder to transmit new transaction
        => Should have a specific roles on the rewarder contract, to be able to perform that operation and only that one
        - Updater roles on Rewarder
        == Roles available : Minter
    - Rewarder -> Handle new nft transaction, can be called to pay user and podcaster, 
        - Listener badges
        - Owner badges
        - Updater roles and badges
        == Roles available : Payer & Updater 
    - Minter -> Should compute the cost of minting each nft, from a podcaster or a listener POV, perform the mint and burn the associated tokens
        - CostBadges ? NftBadges ? To know the price of minting new SNFT ? 
        - Cost of minting depending on number of share ?
        - Minter roles InternalTokens
        == Roles available : Minter
    - Orchestrator ->
        - Take as param tokens address
        - Build the two badges contract
        - Build the rewarder contract
        - Build the minter contract
        - Grant the right roles

listener
podcastId[]
listenCount[]

limit listen count per user per day per podcast -> open to ext

Badge podcast : 
    - Listen count on the week (so timestamp count)
    - Coefficient on investment
        - for 10 leg, 30 rare, 45 common, 400000 standart
        - 10 x LegCoef + 30 x RareCoef + 45 x CommonCoef (no standart)
    - Adjustable token on burn

toMint =
    - nbrListen x badgePodcast x (nbrLeg x coef)
    - same for rare, classic and standart

Percent Partage podcast 

Percent per token types -> mapping open to ext

NFT fraction prices
    -> Initial price
    -> Then recomputed in function of the interest arround the podcast listen count -> With a new CostBadges

Royalties sur NFT tx
    -> 6% for first mint to podcaster
    -> 4% for other tx to podcast and 2% for sybel ecosystem

Burn : 
    - Sur inactivité
    - Mint plus de fraction sur ton token
    - Burn pour lvl up badge podcast
    - Burn pour popup / boost de reco
    - Burn pour increase listen count on podcast

Loop sur l'ensemble des tokens posseder par l'utilisateur pour ce podcast


Referral : 
    - Pecule de TSE au moment du first mint
    - Depend de la qualité du mint

Coef per token types -> mapping open to ext

Standart granted at each listen if user not listener


TODO : 
    - Timestamp per account usage (in badge) to burn user token if inactive
    - Royalties on SNFT 
    - Pool of interact to earn, so badges get a portion of the pools 



Sub NFT ->
    - Fraction of the podcast remuneration
        - Classic -> 
        - Rare ->
        - Epic -> 
    - If not podcast taken, where goes the remuneration ?
    - 


----

 */
contract Orchestrator is IOrchestrator, OwnerPausable {
    /**
     * @dev Access our internal token
     */
    InternalTokens private internalTokens;

    /**
     * @dev Access our governance token
     */
    GovernanceToken private governanceToken;

    /**
     * @dev Access our rewarder contract
     */
    IRewarder private rewarder;

    /**
     * @dev Access our minter contract
     */
    IMinter private minter;

    /**
     * @dev Access our updater contract
     */
    IUpdater private updater;

    /**
     * @dev Access our listener badges
     */
    IListenerBadges public listenerBadges;

    /**
     * @dev Access our podcast badges
     */
    IPodcastBadges public podcastBadges;

    /**
     * @dev Event pushed when a contract change address
     */
    event ContractAddressChanged(address newAddress, string id);

    /**
     * @dev Build our orchestrator from the deployed governance and internal token contracts
     */
    constructor(address governanceTokenAddr, address internalTokenAddr) {
        // Find our internal token provider contract
        internalTokens = InternalTokens(internalTokenAddr);
        // Find our governance token provider contract
        governanceToken = GovernanceToken(governanceTokenAddr);
        // Create our initial rewarder, minter and updater contract
        rewarder = new Rewarder(governanceTokenAddr, internalTokenAddr);
        emit ContractAddressChanged(address(rewarder), "rewarder");
        minter = new Minter(governanceTokenAddr, internalTokenAddr);
        emit ContractAddressChanged(address(minter), "minter");
        updater = new Updater();
        emit ContractAddressChanged(address(updater), "updater");
        // Create the initial bades contracts
        podcastBadges = new PodcastBadges();
        emit ContractAddressChanged(address(podcastBadges), "podcast_badges");
        listenerBadges = new ListenerBadges();
        emit ContractAddressChanged(address(listenerBadges), "listener_badges");

        console.log(address(rewarder));

        // Grand the admin roles and each sub contracts
        rewarder.grantRole(SybelRoles.ADMIN, _msgSender());
        minter.grantRole(SybelRoles.ADMIN, _msgSender());
        updater.grantRole(SybelRoles.ADMIN, _msgSender());

        // Grand the updater roles on all the contract from this one
        rewarder.grantRole(SybelRoles.ADDRESS_UPDATER, address(this));
        minter.grantRole(SybelRoles.ADDRESS_UPDATER, address(this));
        updater.grantRole(SybelRoles.ADDRESS_UPDATER, address(this));

        // TODO : Should update the listener badges on all the contracts
        // TODO : Setup the badges in the constructor for performance and fees efficiency ???

        // TODO : Big checkup on all the roles, standby for now since we only perfom conception
        // Grand the roles for the badges
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(rewarder));
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
        listenerBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
    }

    /**
     * @dev Update the roles on our internal token (need to happen post creation, since at start we don't have the right roles on it)
     */
    function updateInternalTokenRole() external onlyOwner whenNotPaused {
        internalTokens.grantRole(SybelRoles.ADDRESS_UPDATER, address(this));
        internalTokens.updateUpdaterAddr(address(updater));
        internalTokens.grantRole(SybelRoles.MINTER, address(updater));
    }

    /**
     * @dev Update our rewarder contract
     */
    function updateRewarder(address newRewarderAddr)
        external
        override
        onlyOwner
        whenNotPaused
    {
        // TODO : Require the admin role on the new rewarder addr
        // Pause the previous rewarder
        if (address(rewarder) != address(0)) {
            rewarder.pause();
            // TODO : If too much increase in gas fee not needed
            podcastBadges.revokeRole(
                SybelRoles.BADGE_UPDATER,
                address(rewarder)
            );
        }
        // Update our rewarder
        rewarder = IRewarder(newRewarderAddr);
        // Grant updater roles on podcast badges
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(rewarder));
        // TODO : Send the update to the concerned contract, and grant the right roles
        emit ContractAddressChanged(newRewarderAddr, "rewarder");
    }

    /**
     * @dev Update our rewarder contract
     */
    function updateMinter(address newMinterAddr)
        external
        override
        onlyOwner
        whenNotPaused
    {
        // TODO : Require the admin role on the new minter addr
        // Pause the previous minter
        if (address(minter) != address(0)) {
            minter.pause();
        }
        // Update our minter
        minter = IMinter(newMinterAddr);
        // Grant the minter roles to the itnernal tokens contract
        internalTokens.grantRole(SybelRoles.MINTER, address(updater));
        // TODO : Send the update to the concerned contract, and grant the right roles
        emit ContractAddressChanged(newMinterAddr, "minter");
    }

    /**
     * @dev Update our rewarder contract
     */
    function updateUpdater(address newUpdaterAddr)
        external
        override
        onlyOwner
        whenNotPaused
    {
        // TODO : Require the admin role on the new updater addr
        // Pause the previous updater
        if (address(updater) != address(0)) {
            updater.pause();
        }
        // Update our updater
        updater = IUpdater(newUpdaterAddr);
        // Grant updater roles on podcast badges
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
        listenerBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
        // TODO : Send the update to the concerned contract, and grant the right roles
        emit ContractAddressChanged(newUpdaterAddr, "updater");
    }

    /**
     * @dev Update our listener badges address
     */
    function updateListenerBadgesAddress(address newAddress)
        external
        override
        onlyOwner
        whenNotPaused
    {
        // TODO : Check that the new address of the right roles (needed for this contract to perform the update operation)
        // TODO : Should pause the previous one
        listenerBadges = IListenerBadges(newAddress);
        // Update the address on all the contract's
        rewarder.updateListenerBadgesAddress(newAddress);
        minter.updateListenerBadgesAddress(newAddress);
        // Grant the right roles for each contract
        listenerBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
        emit ContractAddressChanged(newAddress, "listener_badges");
    }

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress)
        external
        override
        onlyOwner
        whenNotPaused
    {
        // TODO : Check that the new address of the right roles (needed for this contract to perform the update operation)
        // TODO : Should pause the previous one
        podcastBadges = IPodcastBadges(newAddress);
        // Update the address on all the contract's
        rewarder.updatePodcastBadgesAddress(newAddress);
        minter.updatePodcastBadgesAddress(newAddress);
        // Grant the right roles for each contract
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(rewarder));
        podcastBadges.grantRole(SybelRoles.BADGE_UPDATER, address(updater));
        emit ContractAddressChanged(newAddress, "podcast_badges");
    }
}
