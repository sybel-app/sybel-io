// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../../utils/IPausable.sol";

/**
 * @dev Represent our cost badge handler class
 */
interface IFractionCostBadges is IPausable {
    /**
     * @dev Update the cost badge of the given f nft id
     */
    function updateBadge(uint256 _fractionId, uint64 _coefficient) external;

    /**
     * @dev Find the badge for the given f nft id
     */
    function getBadge(uint256 _fractionId) external view returns (uint64);
}
