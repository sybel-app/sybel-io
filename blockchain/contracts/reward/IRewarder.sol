// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../badges/accessor/IBadgeAccessor.sol";
import "../utils/pausable/IPausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @dev Represent our rewarder contract
 */
interface IRewarder is IPausable, IBadgeAccessor {
    /**
     * @dev Pay a group of user listening
     */
    function payUserListen(
        address[] calldata _listenerAddresses,
        uint256[] calldata _listenCounts
    ) external;

    /**
     * @dev Pay a group of podcast owner
     */
    function payPodcastOwner(
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external;
}
