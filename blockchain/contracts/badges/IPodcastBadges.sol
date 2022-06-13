// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./models/PodcastBadge.sol";
import "../utils/pausable/IPausable.sol";

/**
 * @dev Represent our podcast badge contract
 */
interface IPodcastBadges is IPausable {
    /**
     * @dev Update the podcast internal coefficient
     */
    function updateCoefficient(uint256 podcastId, uint256 coefficient) external;

    /**
     * @dev Update the share count of a podcast
     */
    function updateShareCount(uint256 podcastId, uint256 shareCount) external;

    /**
     * @dev Update the investor count for a podcast
     */
    function updateNumberInvestors(uint256 podcastId, uint256 numberOfInvestor)
        external;

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    /**
     * @dev Find the badge for the given podcast
     */
    function getBadge(uint256 podcastId)
        external
        view
        returns (PodcastBadge memory);
}
