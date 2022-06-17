// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../badges/access/IPaymentBadgeAccessor.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our updater contract
 */
interface IUpdater is IPausable, IPaymentBadgeAccessor {
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
