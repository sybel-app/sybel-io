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
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
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
        _beforeListenerBadgesAddressUpdate(newAddress);
        listenerBadges = IListenerBadges(newAddress);
        emit BadgeAddressChanged(newAddress, "listener_badges");
        _afterListenerBadgesAddressUpdate(newAddress);
    }

    function _beforeListenerBadgesAddressUpdate(address newAddress)
        internal
        virtual
    {}

    function _afterListenerBadgesAddressUpdate(address newAddress)
        internal
        virtual
    {}

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress)
        external
        virtual
        override
        onlyAddressUpdater
    {
        _beforePodcastBadgesAddressUpdate(newAddress);
        podcastBadges = IPodcastBadges(newAddress);
        emit BadgeAddressChanged(newAddress, "podcast_badges");
        _afterPodcastBadgesAddressUpdate(newAddress);
    }

    function _beforePodcastBadgesAddressUpdate(address newAddress)
        internal
        virtual
    {}

    function _afterPodcastBadgesAddressUpdate(address newAddress)
        internal
        virtual
    {}
}
