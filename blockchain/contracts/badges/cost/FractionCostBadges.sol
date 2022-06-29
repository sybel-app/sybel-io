// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IFractionCostBadges.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
/// @custom:security-contact crypto-support@sybel.co
contract FractionCostBadges is
    IFractionCostBadges,
    SybelAccessControlUpgradeable
{
    // Map f nft id to cost badge
    mapping(uint256 => uint64) fractionBadges;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __SybelAccessControlUpgradeable_init();

        // TODO : Build initial badges for each token types

        // Grant the badge updater role to the contract deployer
        _grantRole(SybelRoles.BADGE_UPDATER, msg.sender);
    }

    /**
     * @dev Update the podcast internal coefficient
     */
    function updateBadge(uint256 fractionId, uint64 badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        fractionBadges[fractionId] = badge;
    }

    /**
     * @dev Get the payment badges for the given informations
     */
    function getBadge(uint256 fractionId)
        external
        view
        override
        whenNotPaused
        returns (uint64)
    {
        return fractionBadges[fractionId];
    }
}
