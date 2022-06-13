// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./models/ListenerBadge.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our lisener badge handler class
 */
interface IListenerBadges is IPausable, IAccessControl {
    /**
     * @dev Update the listener snft amount
     */
    function updateCoefficient(address listener, uint256 coefficient) external;

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
     * @dev Find the badge for the given lsitener
     */
    function getBadge(address listener)
        external
        view
        returns (ListenerBadge memory);

    /**
     * @dev Get the multiplier for the given listener
     */
    function getMultiplier(address listener) external view returns (uint256);
}
