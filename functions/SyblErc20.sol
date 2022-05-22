  // SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// https://mumbai.polygonscan.com/tx/0x94319d4f94814015fb84a1c9a80a21443163ea319072f629d4846a0f84111458
contract SYBL is ERC20 {
    uint256 totalSupply_ = 3000000000 ether;
    constructor() ERC20("Sybel", "SYBL") {
        _mint(msg.sender, totalSupply_); // mon wallet
    }
    function transferToken(address to, uint256 plays) public {
        uint256 amount =  plays * 0.0001 ether;
        transfer(to, amount);
    }    
}