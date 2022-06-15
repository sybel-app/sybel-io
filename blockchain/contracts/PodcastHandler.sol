// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./utils/SybelMath.sol";
import "./utils/SybelRoles.sol";
import "./utils/pausable/OwnerPausable.sol";
import "./badges/IListenerBadges.sol";
import "./badges/IPodcastBadges.sol";
import "./IPodcastHandler.sol";
import "./badges/ListenerBadges.sol";
import "./badges/PodcastBadges.sol";
import "./badges/accessor/OwnableBadgeAccessor.sol";
import "./tokens/InternalTokens.sol";

/**
 * @dev Podcast handler contract, represent the entry point of our d apps
  * Deployment Steps : 
  1 - deploy governance and internal tokens
  2 - deploy podcast handler with governance and internal tokens address as param
  3 - grand the minter and addr updater role to the podcast handler contract in the internal tokens
  4 - call the updateBadgesAddrOnInnerContract() on the podcast handler contract (it will refresh the badges address, and associate the right roles)
  5 - you're (theorically) ready to goooo
 */
contract PodcastHandler is
    IPodcastHandler,
    OwnableBadgeAccessor,
    OwnerPausable
{
    // Our base reward amount for podcast listen and owner
    uint256 private OWNER_PUBLISH_REWARD = SybelMath.DECIMALS; // So 1 TSE

    /**
     * @dev Access our internal token
     * @dev Required ? The podcast minting should be exposed in another contract no ??
     */
    InternalTokens private internalTokens;

    /**
     * @dev Build our podcast handler from the deployed governance and internal token contracts
     */
    constructor(address internalTokenAddr) {
        // Create our initial badges contracts
        listenerBadges = new ListenerBadges();
        podcastBadges = new PodcastBadges();
        // Find our internal token provider contract
        internalTokens = InternalTokens(internalTokenAddr);
    }

    /**
     * @dev Update the address of the badges computer on governance token
     * Should be call after a deployment, when this address contract as been granted the podcast updater role
     */
    function updateBadgesAddrOnInnerContract()
        external
        onlyOwner
        whenNotPaused
    {
        // Update the address for the different badges
        internalTokens.updateListenerBadgesAddress(address(listenerBadges));
        internalTokens.updatePodcastBadgesAddress(address(podcastBadges));
        // Grand the roles
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }

    function updateInternalTokenAddress(address _newInternalTokenAddress)
        external
    {
        // Find our internal token provider contract
        internalTokens = InternalTokens(_newInternalTokenAddress);
        // Grand the updater roles on our governance token for the badges contract
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            _newInternalTokenAddress
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            _newInternalTokenAddress
        );
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external override onlyOwner whenNotPaused {
        // Try to mint the podcast
        uint256 podcastId = internalTokens.mintPodcast(
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _data,
            _podcastOwnerAddress
        );
        // TODO : Do something with the podcast id ? Pay the podcaster directly ??
        // TODO : Call the rewarder contract to pay the creator ??
    }

    /**
     * @dev Pause all the contracts
     */
    function pauseAll() external override onlyOwner {
        // Pause the badges calculation
        listenerBadges.pause();
        podcastBadges.pause();
        // Pause the token provider
        // Pause this contract
        _pause();
    }

    /**
     * @dev Resume all the contracts
     */
    function unPauseAll() external override onlyOwner {
        // Pause the badges calculation
        listenerBadges.unpause();
        podcastBadges.unpause();
        // Pause the token provider
        // Un Pause this contract
        _unpause();
    }

    /**
     * @dev Update our listener badges address
     * Overrided to grant the role for the governance token to update the value
     */
    /*function __afterListenerBadgesAddressUpdate() external override onlyOwner {
        // Update the address for the internal tokens, and set the right roles
        internalTokens.updateListenerBadgesAddress(address(listenerBadges));
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }*/

    /**
     * @dev Update our podcast badges address
     */
    /*function _afterPodcastBadgesAddressUpdate() external override onlyOwner {
        // Update the address for the internal tokens, and set the right roles
        internalTokens.updatePodcastBadgesAddress(address(podcastBadges));
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }*/
}
