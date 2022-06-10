// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBadgeAccessor.sol";
import "../IListenerBadges.sol";
import "../IPodcastBadges.sol";

/**
 * @dev Represent a pausable contract
 */
abstract contract BadgeAccessor is IBadgeAccessor, Ownable {

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
    function updateListenerBadgesAddress(address newAddress) external override onlyOwner {
        listenerBadges = IListenerBadges(newAddress);
    }

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress) external override onlyOwner {
        podcastBadges = IPodcastBadges(newAddress);
    }

    /**
     * @dev Update our both badges address
     */
    function updateAllBadgesAddress(address listenerAddress, address podcastAddress) external override onlyOwner {
        listenerBadges = IListenerBadges(listenerAddress);
        podcastBadges = IPodcastBadges(podcastAddress);
    }
}
