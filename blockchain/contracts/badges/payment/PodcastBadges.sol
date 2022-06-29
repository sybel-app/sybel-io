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
    function updateBadge(uint256 _podcastId, uint64 _badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        podcastBadges[_podcastId] = _badge;
    }

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata
    ) external override onlyRole(SybelRoles.BADGE_UPDATER) whenNotPaused {
        for (uint256 i = 0; i < _ids.length; ++i) {
            if (
                _from != address(0) &&
                _to != address(0) &&
                SybelMath.isPodcastNft(_ids[i])
            ) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = SybelMath.extractPodcastId(_ids[i]);
                owners[podcastId] = _to;
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
        uint64 podcastBadge = podcastBadges[_podcastId];
        if (podcastBadge == 0) {
            // If the badge of this podcast isn't set yet, set it to default
            podcastBadge = SybelMath.DECIMALS;
        }
        return (podcastBadge, owners[_podcastId]);
    }
}
