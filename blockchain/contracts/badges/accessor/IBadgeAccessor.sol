// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../models/BadgeAddresses.sol";

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

    /**
     * @dev Update our both badges address
     */
    function updateAllBadgesAddress(BadgeAddresses calldata addresses) external;

    /**
     * @dev Get the current badges address
     */
    function getBadgesAddress() external view returns (BadgeAddresses memory);
}
