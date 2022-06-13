// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IListenerBadges.sol";
import "./models/ListenerBadge.sol";
import "./BadgesAccessControl.sol";
import "../utils/SybelMath.sol";
import "../utils/pausable/AccessControlPausable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract ListenerBadges is
    IListenerBadges,
    BadgesAccessControl,
    AccessControlPausable
{
    // Map of user address to listener badge
    mapping(address => ListenerBadge) listenerBadges;

    // Amount of nft a listener has
    mapping(address => uint256) public listenerNfts;

    /**
     * @dev Update the listener snft amount
     */
    function updateCoefficient(address listener, uint256 coefficient)
        external
        override
        onlyUpdater
        whenNotPaused
    {
        listenerBadges[listener].coefficient = coefficient;
    }

    /**
     * @dev Update the listener snft amount
     */
    function updateSnftAmount(address listener, uint256 sNftamount)
        external
        override
        onlyUpdater
        whenNotPaused
    {
        listenerBadges[listener].sNftOwnedCount = sNftamount;
    }

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external override onlyUpdater whenNotPaused {
        // In the case we are sending the token to a given wallet
        for (uint256 i = 0; i < ids.length; ++i) {
            // Handling investor array update, and token supplies
            if (SybelMath.isPodcastRelatedToken(ids[i])) {
                // If we got a to address (so not a burn token)
                if (to != address(0)) {
                    // Update the number of token held by this listener
                    listenerNfts[from] += amounts[i];
                }
                // If we got a from address, so not a minted token
                if (from != address(0)) {
                    // Update the number of token held by this listener
                    listenerNfts[from] -= amounts[i];
                }
            }
        }
    }

    /**
     * @dev Find the badge for the given lsitener
     */
    function getBadge(address listener)
        external
        view
        override
        returns (ListenerBadge memory)
    {
        return listenerBadges[listener];
    }
}
