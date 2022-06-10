// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./IPausable.sol";

/**
 * @dev Represent a pausable contract
 */
abstract contract OwnerPausable is IPausable, Pausable, Ownable {
    

    /**
     * @dev Pause the contracts
     */
    function pause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Resume the contracts
     */
    function unpause() external override onlyOwner {
        _unpause();
    }
}
