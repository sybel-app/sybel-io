// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../badges/access/IPaymentBadgeAccessor.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our rewarder contract
 */
interface IRewarder is IPausable, IPaymentBadgeAccessor {
    /**
     * @dev Pay a user for all the listening he have done on different podcast
     */
    function getPaymentBadges(
        address _listener,
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external;
}
