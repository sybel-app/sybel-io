// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IListenerBadges.sol";
import "./models/ListenerBadge.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/pausable/AccessControlPausable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract ListenerBadges is IListenerBadges, AccessControlPausable {
    // Map of user address to listener badge
    mapping(address => ListenerBadge) listenerBadges;

    /**
     * @dev Update the listener snft amount
     */
    function updateCoefficient(address listener, uint256 coefficient)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        listenerBadges[listener].coefficient = coefficient;
    }

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external override onlyRole(SybelRoles.BADGE_UPDATER) whenNotPaused {}

    /**
     * @dev Find the badge for the given lsitener
     */
    function getBadge(address listener)
        external
        view
        override
        returns (ListenerBadge memory)
    {
        return listenerBadges[listener];
    }

    /**
     * @dev Get the multiplier for the given listener
     */
    function getMultiplier(address listener)
        external
        view
        override
        returns (uint256)
    {
        return 1 + listenerBadges[listener].coefficient;
    }
}
