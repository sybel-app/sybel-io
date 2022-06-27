// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IPodcastBadges.sol";
import "./models/PodcastBadge.sol";
import "./models/PodcastPaymentBadge.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
/// @custom:security-contact crypto-support@sybel.co
contract PodcastBadges is IPodcastBadges, SybelAccessControlUpgradeable {
    // Map podcast id to Podcast badge
    mapping(uint256 => PodcastBadge) podcastBadges;

    // Id of podcast to owner of podcast
    mapping(uint256 => address) public owners;

    // Token tyes to investment coefficient
    mapping(uint256 => uint256) public typesToCoefficients;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override initializer {
        super.initialize();

        // TODO : Initial types to coef ??

        // Grant the badge updater role to the contract deployer
        _grantRole(SybelRoles.BADGE_UPDATER, msg.sender);
    }

    /**
     * @dev Update the podcast internal coefficient
     */
    function updateCoefficient(uint256 podcastId, uint256 coefficient)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        podcastBadges[podcastId].coefficient = coefficient;
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
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            // Handling investor array update, and token supplies
            if (SybelMath.isPodcastRelatedToken(ids[i])) {
                // Get the id of the podcast
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                // Get the type of the token
                uint256 tokenTypes = SybelMath.extractTokenType(ids[i]);
                // If that was a freshly minted token, and not a burn one, update the coefficient
                if (from == address(0) && to != address(0)) {
                    // Compute the coefficient from the token types and append it to our current one
                    uint256 newCoefficient = typesToCoefficients[tokenTypes];
                    podcastBadges[podcastId]
                        .investmentCoefficient += newCoefficient;
                } else if (to == address(0)) {
                    // In the case it's a burned token, decrease the coefficient
                    uint256 newCoefficient = typesToCoefficients[tokenTypes];
                    podcastBadges[podcastId]
                        .investmentCoefficient += newCoefficient;
                }
            } else if (SybelMath.isPodcastNft(ids[i])) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                owners[podcastId] = to;
            }
        }
    }

    /**
     * @dev Find the badge for the given podcast
     */
    function getBadge(uint256 podcastId)
        external
        view
        override
        returns (PodcastBadge memory)
    {
        return podcastBadges[podcastId];
    }

    /**
     * @dev Get the payment badges for the given informations
     */
    function getPaymentBadge(uint256 podcastId, uint256 listenCount)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
        returns (PodcastPaymentBadge memory)
    {
        // TODO : All this logic should be triggered from the rewarder contract ?? Or from the updater one ?
        // TODO : Should we remarge the rewarder contract with the updater one ?
        // TODO : Advantage of separate updater -> internal tokens doesn't havn't to know the existance of the rewarder, so we are more flexible on update of this contract
        // Assert that the podcast timestamp was refreshed less than a week ago
        uint256 dayBetweenPodcast = computeDayBetweenTimestamp(
            podcastId,
            block.timestamp
        );
        if (dayBetweenPodcast >= 7) {
            // If the listen period is superior to a week, update the listen count values
            podcastBadges[podcastId].lastWeekListenCount = podcastBadges[
                podcastId
            ].currentWeekListenCount;
            podcastBadges[podcastId].lastWeekTimestamp = block.timestamp;
        }
        // In all the case, increment the current week listen count
        podcastBadges[podcastId].currentWeekListenCount += listenCount;

        // Once we've done that, compute the multiplier to be applied
        // TBD : This formula isn't really fixed, we have some other paramter to take in account, check with Matt
        // TODO : What is the place of the sybel coefficient in that ?
        uint256 multiplier = podcastBadges[podcastId].lastWeekListenCount *
            podcastBadges[podcastId].investmentCoefficient *
            podcastBadges[podcastId].coefficient;

        // TODO : Check the rarest token the user got for this podcast
        // TODO : Should be checked before ? Or saved in a mapp ? Like userAddress to (podcastId to rarestTokenType) ??
        // TODO : The mapping will be great to perform chained call to balanceOf on different token types (at least 5 call), for each token types
        return PodcastPaymentBadge(owners[podcastId], multiplier);
    }

    /**
     * @dev Compute the delay in day between two timestamp
     */
    function computeDayBetweenTimestamp(
        uint256 initialTimestamp,
        uint256 finalTimestamp
    ) private pure returns (uint256) {
        // TODO : Safe math
        return (finalTimestamp - initialTimestamp) / 60 / 60 / 24;
    }
}
