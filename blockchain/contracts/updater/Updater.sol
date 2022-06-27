// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IUpdater.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Represent our updater contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract Updater is
    IUpdater,
    SybelAccessControlUpgradeable,
    PaymentBadgesAccessor
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address listenerBadgesAddr, address podcastBadgesAddr)
        public
        initializer
    {
        super.initialize();
        _PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);
    }

    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external override onlyRole(SybelRoles.BADGE_UPDATER) {
        // Update the podcast badges
        podcastBadges.updateFromTransaction(from, to, ids, amounts);
    }
}
