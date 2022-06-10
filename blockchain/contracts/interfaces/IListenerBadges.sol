// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../models/ListenerBadge.sol";
import "../models/PodcastBadge.sol";

/**
 * @dev Represent our lisener badge handler class
 */
interface IListenerBadges {

    /**
    * @dev Update the listener snft amount
    */
    function updateCoefficient(address listener, uint coefficient) external;

    /**
    * @dev Update the listener snft amount
    */
    function updateSnftAmount(address listener, uint sNftamount) external;

    /**
    * @dev Find the badge for the given lsitener
    */
    function getBadge(address listener) external view returns (ListenerBadge memory);
    
}