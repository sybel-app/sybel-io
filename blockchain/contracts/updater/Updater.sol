// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IUpdater.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/pausable/AccessControlPausable.sol";

/**
 * @dev Represent our updater contract
 */
contract Updater is IUpdater, AccessControlPausable, PaymentBadgesAccessor {
    /**
     * @dev Update the badges from a transaction record
     */
    function updateFromTransaction(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external override {
        // TODO : Specific roles required to do that ??
        // TODO : Call the badges calculator
        // TODO : Access the badges address ?
    }
}
