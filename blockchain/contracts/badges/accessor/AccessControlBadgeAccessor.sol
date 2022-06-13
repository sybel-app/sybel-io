// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IBadgeAccessor.sol";
import "../IListenerBadges.sol";
import "../IPodcastBadges.sol";
import "../../utils/SybelRoles.sol";

/**
 * @dev Represent a pausable contract
 */
abstract contract AccessControlBadgeAccessor is IBadgeAccessor, AccessControl {
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Allow only the address updater role
    modifier onlyAddressUpdater() {
        _checkRole(SybelRoles.ADDRESS_UPDATER_ROLE);
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
        virtual
        override
        onlyAddressUpdater
    {
        listenerBadges = IListenerBadges(newAddress);
        emit BadgeAddressChanged(newAddress, "listener_badges");
    }

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress)
        external
        virtual
        override
        onlyAddressUpdater
    {
        podcastBadges = IPodcastBadges(newAddress);
        emit BadgeAddressChanged(newAddress, "podcast_badges");
    }
}
