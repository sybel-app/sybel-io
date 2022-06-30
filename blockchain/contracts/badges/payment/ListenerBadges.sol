// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./IListenerBadges.sol";
import "../../utils/SybelMath.sol";
import "../../utils/SybelRoles.sol";
import "../../utils/SybelAccessControlUpgradeable.sol";

/**
 * @dev Handle the computation of our listener badges
 */
/// @custom:security-contact crypto-support@sybel.co
contract ListenerBadges is IListenerBadges, SybelAccessControlUpgradeable {
    // Map of user address to listener badge
    mapping(address => uint64) listenerBadges;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __SybelAccessControlUpgradeable_init();

        // Grant the badge updater role to the contract deployer
        _grantRole(SybelRoles.BADGE_UPDATER, msg.sender);
    }

    /**
     * @dev Update the listener snft amount
     */
    function updateBadge(address _listener, uint64 _badge)
        external
        override
        onlyRole(SybelRoles.BADGE_UPDATER)
        whenNotPaused
    {
        listenerBadges[_listener] = _badge;
    }

    /**
     * @dev Find the badge for the given lsitener
     */
    function getBadge(address _listener)
        external
        view
        override
        returns (uint64)
    {
        uint64 listenerBadge = listenerBadges[_listener];
        if (listenerBadge == 0) {
            // If the badge of this listener isn't set yet, set it to default
            listenerBadge = 1;
        }
        return listenerBadge;
    }
}
