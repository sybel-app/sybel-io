// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IOrchestrator.sol";
import "../badges/accessor/OwnableBadgeAccessor.sol";
import "../utils/pausable/OwnerPausable.sol";
import "../reward/IRewarder.sol";
import "../reward/Rewarder.sol";
import "../minter/IMinter.sol";
import "../minter/Minter.sol";
import "../tokens/InternalTokens.sol";

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


----

 */
contract Orchestrator is IOrchestrator, OwnableBadgeAccessor, OwnerPausable {
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
        // Create our initial rewarder and minter contract
        rewarder = new Rewarder(governanceTokenAddr, internalTokenAddr);
        emit ContractAddressChanged(address(rewarder), "rewarder");
        minter = new Minter(governanceTokenAddr, internalTokenAddr);
        emit ContractAddressChanged(address(minter), "minter");
        // Grand the updater roles on our governance token for the badges contract
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokenAddr)
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokenAddr)
        );
    }

    /**
     * @dev Update our rewarder contract
     */
    function updateRewarder(address newRewarderAddr)
        external
        override
        onlyOwner
    {
        // TODO : Require the admin role on the new rewarder addr
        // Pause the previous rewarder
        if (address(rewarder) != address(0)) {
            rewarder.pause();
        }
        // Update our rewarder
        rewarder = IRewarder(newRewarderAddr);
        // TODO : Send the update to the concerned contract, and grant the right roles
        emit ContractAddressChanged(newRewarderAddr, "rewarder");
    }

    /**
     * @dev Update our rewarder contract
     */
    function updateMinter(address newMinterAddress)
        external
        override
        onlyOwner
    {
        // TODO : Require the admin role on the new minter addr
        // Pause the previous minter
        if (address(minter) != address(0)) {
            minter.pause();
        }
        // Update our minter
        minter = IMinter(newMinterAddress);
        // TODO : Send the update to the concerned contract, and grant the right roles
        emit ContractAddressChanged(newMinterAddress, "minter");
    }

    /**
     * @dev Update our listener badges address
     */
    function _beforeListenerBadgesAddressUpdate(address newAddress)
        internal
        override
        onlyOwner
    {
        // TODO : Check that the new address of the right roles (needed for this contract to perform the update operation)
    }

    /**
     * @dev Update our listener badges address
     */
    function _afterListenerBadgesAddressUpdate(address newAddress)
        internal
        override
        onlyOwner
    {
        // Update the address on all the contract's
        rewarder.updateListenerBadgesAddress(newAddress);
        minter.updateListenerBadgesAddress(newAddress);
        internalTokens.updateListenerBadgesAddress(newAddress);
        // Grant the right roles for each contract
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }

    /**
     * @dev Before the update our podcast badges address
     */
    function _beforePodcastBadgesAddressUpdate(address newAddress)
        internal
        override
        onlyOwner
    {
        // TODO : Check that the new address of the right roles (needed for this contract to perform the update operation)
    }

    /**
     * @dev Update our podcast badges address
     */
    function _afterPodcastBadgesAddressUpdate(address newAddress)
        internal
        override
        onlyOwner
    {
        // TODO : Should pause the previous one
        // Update the address on all the contract's
        rewarder.updatePodcastBadgesAddress(newAddress);
        minter.updatePodcastBadgesAddress(newAddress);
        internalTokens.updatePodcastBadgesAddress(newAddress);
        // Grant the right roles for each contract
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }
}
