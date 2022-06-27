// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "../utils/SybelMath.sol";
import "../utils/MintingAccessControlUpgradeable.sol";

/// @custom:security-contact crypto-support@sybel.co
contract SybelMediaToken is ERC20Upgradeable, MintingAccessControlUpgradeable {
    // The supply available for minting
    uint256 private _availableSupply = 3000000000**decimals();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override initializer {
        __ERC20_init("Sybel Media Token", "SMT");
        super.initialize();
    }

    function decimals() public pure override returns (uint8) {
        return SybelMath.DECIMALS_COUNT;
    }

    /**
     * @dev Mint new SMT
     */
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
        // Decrease the available supply
        _availableSupply -= amount;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        if (to == address(0)) {
            // In the case of a mint, ensure we got enoguh supply
            require(
                amount < _availableSupply,
                "SYB: Not enough remaining token to perform the minting"
            );
        }
        super._beforeTokenTransfer(from, to, amount);
    }
}
