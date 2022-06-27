// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/SybelAccessControlUpgradeable.sol";

/// @custom:security-contact crypto-support@sybel.co
contract SybelMediaToken is
    Initializable,
    ERC20Upgradeable,
    SybelAccessControlUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // The supply available for minting
    uint256 private _availableSupply = 3000000000**decimals();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override initializer {
        __ERC20_init("Sybel Media Token", "SMT");
        super.initialize();

        _grantRole(MINTER_ROLE, msg.sender);
    }

    function decimals() public pure override returns (uint8) {
        return SybelMath.DECIMALS_COUNT;
    }

    /**
     * @dev Allow only the minter role
     */
    modifier onlyMinter() {
        _checkRole(MINTER_ROLE);
        _;
    }

    /**
     * @dev Mint new SMT
     */
    function mint(address to, uint256 amount) public onlyMinter {
        // Ensure we got enough supply
        require(
            amount < _availableSupply,
            "SYB: Not enough remaining token to perform the minting"
        );
        _mint(to, amount);
        // Decrease the available supply
        _availableSupply -= amount;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
        if (to == address(0)) {
            // In the case of a mint, ensure we got enoguh supply
            require(
                amount < _availableSupply,
                "SYB: Not enough remaining token to perform the minting"
            );
        }
    }
}
