// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../../utils/IPausable.sol";

/**
 * @dev Represent our lisener badge handler class
 */
interface IListenerBadges is IPausable {
    /**
     * @dev Update the listener custom coefficient
     */
    function updateBadge(address listener, uint64 coefficient) external;

    /**
     * @dev Find the badge for the given listener
     */
    function getBadge(address listener) external view returns (uint64);
}
