// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Represent a pausable contract
 */
interface IPausable {

    /**
     * @dev Pause the contract
     */
    function pause() external;

    /**
     * @dev Resume the contract
     */
    function unpause() external;

}