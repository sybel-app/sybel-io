// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent a contract that can access the payments badges contract
 */
interface IPaymentBadgeAccessor is IAccessControl {
    /**
     * @dev Update our listener badges address
     */
    function updateListenerBadgesAddress(address newAddress) external;

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress) external;
}
