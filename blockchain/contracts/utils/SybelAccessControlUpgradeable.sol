// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./pausable/IPausable.sol";

/// @custom:security-contact crypto-support@sybel.co
abstract contract SybelAccessControlUpgradeable is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public virtual initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev Allow only the pauser role
     */
    modifier onlyPauser() {
        _checkRole(PAUSER_ROLE);
        _;
    }

    /**
     * @dev Allow only the upgrader role
     */
    modifier onlyUpgrader() {
        _checkRole(UPGRADER_ROLE);
        _;
    }

    /**
     * @dev Pause this smart contract
     */
    function pause() public onlyPauser {
        _pause();
    }

    /**
     * @dev Un pause this smart contract
     */
    function unpause() public onlyPauser {
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
