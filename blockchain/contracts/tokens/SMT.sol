// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../utils/SybelMath.sol";

contract SybGovernanceToken is ERC20 {
    uint256 totalSupply_ = 3000000000**decimals();

    constructor() ERC20("SMT (Sybel)", "SMT") {
        // Directly mint all the supply
        // TODO : Sure about that ? Mint on demand or mint via TSE burn ?
        _mint(msg.sender, totalSupply_);
    }

    function decimals() public pure override returns (uint8) {
        return SybelMath.DECIMALS_COUNT;
    }
}
