// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPodcastBadges.sol";
import "./models/PodcastBadge.sol";
import "../utils/SybelMath.sol";
import "./BadgesAccessControl.sol";
import "../utils/pausable/AccessControlPausable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract PodcastBadges is
    IPodcastBadges,
    BadgesAccessControl,
    AccessControlPausable
{
    // Map podcast id to Podcast badge
    mapping(uint256 => PodcastBadge) podcastBadges;

    // Id of podcast to owner of podcast
    mapping(uint256 => address) public owners;

    // id of podcast to array of investor
    mapping(uint256 => address[]) public podcastInvestors;

    /**
     * @dev Update the podcast internal coefficient
     */
    function updateCoefficient(uint256 podcastId, uint256 coefficient)
        external
        override
        onlyUpdater
        whenNotPaused
    {
        podcastBadges[podcastId].coefficient = coefficient;
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
                // If this token is a podcast related one (so classic, rare or epic)
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                // Boolean used to know if the list of podcast investor was updated
                bool isInvestorUpdated = false;
                // If we got a to address (so not a burn token)
                if (to != address(0)) {
                    // Add this listener as an investor of this podcast
                    isInvestorUpdated =
                        isInvestorUpdated ||
                        _addInvestorOnce(podcastInvestors[podcastId], to);
                } else {
                    // In the case of a burn, reduce the share count of this podcast
                    podcastBadges[podcastId].shareCount -= amounts[i];
                }
                // If we got a from address, not a minted token
                if (from != address(0)) {
                    // Remove the from address from the wallet investor
                    isInvestorUpdated =
                        isInvestorUpdated ||
                        _removeInvestorOnce(podcastInvestors[podcastId], from);
                } else {
                    // In the case of a mint, increase the share count of this podcast
                    podcastBadges[podcastId].shareCount += amounts[i];
                }
                // If the list of invesotor was updated, update the badge
                if (isInvestorUpdated) {
                    podcastBadges[podcastId]
                        .numberOfInvestor = podcastInvestors[podcastId].length;
                }
            } else if (SybelMath.isPodcastNft(ids[i])) {
                // If this token is a podcast NFT, change the owner of this podcast
                uint256 podcastId = SybelMath.extractPodcastId(ids[i]);
                owners[podcastId] = to;
            }
        }
    }

    /**
     * @dev Find the badge for the given podcast
     */
    function getBadge(uint256 podcastId)
        external
        view
        override
        returns (PodcastBadge memory)
    {
        return podcastBadges[podcastId];
    }

    /**
     * @dev Remove an investor from the investor array
     * @return true if the investor list was update, false otherwise
     */
    function _removeInvestorOnce(
        address[] storage _investors,
        address _investorAddress
    ) private returns (bool) {
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < _investors.length; ++i) {
            // If we found it, remove it from the array and exit (only remove it once)
            if (_investors[i] == _investorAddress) {
                _investors[i] = _investors[_investors.length - 1];
                _investors.pop();
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Add an investor to the investor array (if he isn't present yet)
     * @return true if the investor list was update, false otherwise
     */
    function _addInvestorOnce(
        address[] storage _investors,
        address _investorAddress
    ) private returns (bool) {
        // Check if the investor is already present in the investor array
        bool isAlreadyAnInvestor = false;
        // Iterate over it to find all the time the investor is mentionned
        for (uint256 i = 0; i < _investors.length; ++i) {
            // Update our already investor address
            isAlreadyAnInvestor =
                isAlreadyAnInvestor ||
                _investors[i] == _investorAddress;
        }
        if (!isAlreadyAnInvestor) {
            // If the user wasn't already an investor of this podcast, add it to the array
            _investors.push(_investorAddress);
            return true;
        }
        return false;
    }

    /**
     * @dev Get the multiplier for the given podcast
     */
    function getMultiplier(uint256 podcastId)
        external
        view
        override
        returns (uint256)
    {
        // Perform some math
        return
            ((1 + podcastBadges[podcastId].coefficient) *
                podcastBadges[podcastId].numberOfInvestor) /
            podcastBadges[podcastId].shareCount;
    }

    /**
     * @dev Get all the investor address of the given podcast
     */
    function getInvestors(uint256 podcastId)
        external
        view
        override
        returns (address[] memory)
    {
        return podcastInvestors[podcastId];
    }

    /**
     * @dev Get the owner of the given podcast
     */
    function getOwner(uint256 podcastId)
        external
        view
        override
        returns (address)
    {
        return owners[podcastId];
    }
}
