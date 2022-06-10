// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPodcastBadges.sol";
import "./models/PodcastBadge.sol";
import "../utils/pausable/OwnerPausable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract PodcastBadges is IPodcastBadges, OwnerPausable {

    // Map podcast id to Podcast badge
    mapping(uint256 => PodcastBadge) podcastBadges;


    /**
    * @dev Update the podcast internal coefficient
    */
    function updateCoefficient(uint podcastId, uint coefficient) external override onlyOwner whenNotPaused {
        podcastBadges[podcastId].coefficient = coefficient;
    }

    /**
    * @dev Update the share count of a podcast
    */
    function updateShareCount(uint podcastId, uint shareCount) external override onlyOwner whenNotPaused {
        podcastBadges[podcastId].shareCount = shareCount;
    }

    /**
    * @dev Update the investor count for a podcast
    */
    function updateNumberInvestors(uint podcastId, uint numberOfInvestor) external override onlyOwner whenNotPaused {
        podcastBadges[podcastId].numberOfInvestor = numberOfInvestor;
    }

    /**
    * @dev Find the badge for the given podcast
    */
    function getBadge(uint podcastId) external override view returns (PodcastBadge memory) {
        return podcastBadges[podcastId];
    }
}
