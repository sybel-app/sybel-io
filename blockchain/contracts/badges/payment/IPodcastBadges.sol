// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./models/PodcastBadge.sol";
import "./models/PodcastPaymentBadge.sol";
import "../../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our podcast badge contract
 */
interface IPodcastBadges is IPausable, IAccessControl {
    /**
     * @dev Update the podcast custom coefficient
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
     * @dev Get the payment badges for the given informations
     */
    function getPaymentBadges(
        address listener,
        uint256[] calldata podcastIds,
        uint256[] calldata listenCounts
    ) external view returns (PodcastPaymentBadge[] memory);
}
