// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IListenerBadges.sol";
import "./models/ListenerBadge.sol";
import "../utils/pausable/OwnerPausable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract ListenerBadges is IListenerBadges, OwnerPausable {

    // Map of user address to listener badge
    mapping(address => ListenerBadge) listenerBadges;


    /**
    * @dev Update the listener snft amount
    */
    function updateCoefficient(address listener, uint coefficient) external override onlyOwner whenNotPaused {
        listenerBadges[listener].coefficient = coefficient;
    }

    /**
    * @dev Update the listener snft amount
    */
    function updateSnftAmount(address listener, uint sNftamount) external override onlyOwner whenNotPaused {
        listenerBadges[listener].sNftOwnedCount = sNftamount;
    }

    /**
    * @dev Find the badge for the given lsitener
    */
    function getBadge(address listener) external override view returns (ListenerBadge memory) {
        return listenerBadges[listener];
    }
}