// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../payment/IListenerBadges.sol";
import "../payment/IPodcastBadges.sol";

/**
 * @dev Represent a contract that can access the badges
 */
/// @custom:security-contact crypto-support@sybel.co
abstract contract PaymentBadgesAccessor is Initializable {
    /**
     * @dev Access our listener badges
     */
    IListenerBadges public listenerBadges;

    /**
     * @dev Access our podcast badges
     */
    IPodcastBadges public podcastBadges;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function _PaymentBadgesAccessor_init(
        address listenerBadgesAddr,
        address podcastBadgesAddr
    ) public virtual initializer {
        listenerBadges = IListenerBadges(listenerBadgesAddr);
        podcastBadges = IPodcastBadges(podcastBadgesAddr);
    }
}
