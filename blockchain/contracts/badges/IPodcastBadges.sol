// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./models/PodcastBadge.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our podcast badge contract
 */
interface IPodcastBadges is IPausable, IAccessControl {
    /**
     * @dev Update the podcast internal coefficient
     */
    function updateCoefficient(uint256 podcastId, uint256 coefficient) external;

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

    /**
     * @dev Get the multiplier for the given podcast
     */
    function getMultiplier(uint256 podcastId) external view returns (uint256);

    /**
     * @dev Get all the investor address of the given podcast
     */
    function getInvestors(uint256 podcastId)
        external
        view
        returns (address[] memory);

    /**
     * @dev Get the owner of the given podcast
     */
    function getOwner(uint256 podcastId) external view returns (address);
}
