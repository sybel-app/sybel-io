// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPaymentBadgeAccessor.sol";
import "../payment/IListenerBadges.sol";
import "../payment/IPodcastBadges.sol";
import "../../utils/SybelRoles.sol";

/**
 * @dev Represent a pausable contract
 */
abstract contract PaymentBadgesAccessor is
    IPaymentBadgeAccessor,
    AccessControl
{
    // Allow only the address updater role
    modifier onlyAddressUpdater() {
        _checkRole(SybelRoles.ADDRESS_UPDATER);
        _;
    }

    /**
     * @dev Access our listener badges
     */
    IListenerBadges public listenerBadges;

    /**
     * @dev Access our podcast badges
     */
    IPodcastBadges public podcastBadges;

    /**
     * @dev Update our listener badges address
     */
    function updateListenerBadgesAddress(address newAddress)
        external
        override
        onlyAddressUpdater
    {
        listenerBadges = IListenerBadges(newAddress);
    }

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress)
        external
        override
        onlyAddressUpdater
    {
        podcastBadges = IPodcastBadges(newAddress);
    }
}
