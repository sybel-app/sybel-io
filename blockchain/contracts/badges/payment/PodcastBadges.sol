// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IPodcastBadges.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
/// @custom:security-contact crypto-support@sybel.co
contract PodcastBadges is IPodcastBadges, SybelAccessControlUpgradeable {
    // Map podcast id to Podcast badge
    mapping(uint256 => uint64) podcastBadges;

    // Id of podcast to owner of podcast
    mapping(uint256 => address) public owners;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __SybelAccessControlUpgradeable_init();

        // Grant the badge updater role to the contract deployer
        _grantRole(SybelRoles.BADGE_UPDATER, msg.sender);
    }

    /**
     * @dev Update the podcast internal coefficient
     */
    function updateBadge(uint256 podcastId, uint64 badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        podcastBadges[podcastId] = badge;
    }

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata
    ) external override onlyRole(SybelRoles.BADGE_UPDATER) whenNotPaused {
        for (uint256 i = 0; i < ids.length; ++i) {
            if (
                from != address(0) &&
                to != address(0) &&
                SybelMath.isPodcastNft(ids[i])
            ) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                owners[podcastId] = to;
            }
        }
    }

    /**
     * @dev Get the payment badges for the given informations
     */
    function getPaymentBadge(uint256 _podcastId)
        external
        view
        override
        whenNotPaused
        returns (uint64, address)
    {
        return (podcastBadges[_podcastId], owners[_podcastId]);
    }
}
