// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IPausable.sol";
import "../utils/SybelRoles.sol";

/// @custom:security-contact crypto-support@sybel.co
abstract contract SybelAccessControlUpgradeable is
    Initializable,
    IPausable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    function __SybelAccessControlUpgradeable_init() public {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(SybelRoles.ADMIN, msg.sender);
        _grantRole(SybelRoles.PAUSER, msg.sender);
        _grantRole(SybelRoles.UPGRADER, msg.sender);
    }

    /**
     * @dev Allow only the pauser role
     */
    modifier onlyPauser() {
        _checkRole(SybelRoles.PAUSER);
        _;
    }

    /**
     * @dev Allow only the upgrader role
     */
    modifier onlyUpgrader() {
        _checkRole(SybelRoles.UPGRADER);
        _;
    }

    /**
     * @dev Pause this smart contract
     */
    function pause() public override onlyPauser {
        _pause();
    }

    /**
     * @dev Un pause this smart contract
     */
    function unpause() public override onlyPauser {
        _unpause();
    }

    /**
     * @dev Authorize the upgrade of this contract
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyUpgrader
    {}
}
