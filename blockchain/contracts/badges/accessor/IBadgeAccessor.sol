// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Represent a contract that can access the badges contract
 */
interface IBadgeAccessor {
    /**
     * @dev Update our listener badges address
     */
    function updateListenerBadgesAddress(address newAddress) external;

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress) external;
}
