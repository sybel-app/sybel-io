// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../utils/IPausable.sol";

/**
 * @dev Represent our updater contract
 */
interface IUpdater is IPausable {
    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;
}
