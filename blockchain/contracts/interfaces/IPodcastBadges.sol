// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../models/PodcastBadge.sol";
import "./IPausable.sol";

/**
 * @dev Represent our podcast badge contract
 */
interface IPodcastBadges is IPausable {

    /**
    * @dev Update the podcast internal coefficient
    */
    function updateCoefficient(uint podcastId, uint coefficient) external;

    /**
    * @dev Update the share count of a podcast
    */
    function updateShareCount(uint podcastId, uint shareCount) external;

    /**
    * @dev Update the investor count for a podcast
    */
    function updateNumberInvestors(uint podcastId, uint numberOfInvestor) external;

    /**
    * @dev Find the badge for the given podcast
    */
    function getBadge(uint podcastId) external view returns (PodcastBadge memory);
    
}