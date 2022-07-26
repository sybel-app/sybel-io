// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

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

    event PodcastBadgeUpdated(uint256 id, uint64 badge);

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
    function updateBadge(uint256 _podcastId, uint64 _badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        podcastBadges[_podcastId] = _badge;
        emit PodcastBadgeUpdated(_podcastId, _badge);
    }

    /**
     * @dev Get the payment badges for the given informations
     */
    function getBadge(uint256 _podcastId)
        external
        view
        override
        whenNotPaused
        returns (uint64)
    {
        uint64 podcastBadge = podcastBadges[_podcastId];
        if (podcastBadge == 0) {
            // If the badge of this podcast isn't set yet, set it to default
            podcastBadge = 1 ether;
        }
        return podcastBadge;
    }
}
