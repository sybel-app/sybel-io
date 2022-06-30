// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../../utils/IPausable.sol";

/**
 * @dev Represent our podcast badge contract
 */
interface IPodcastBadges is IPausable {
    /**
     * @dev Update the listener custom coefficient
     */
    function updateBadge(uint256 _podcastId, uint64 _badge) external;

    /**
     * @dev Update the badges from a transaction record (so just check if the owner of a podcast changed)
     */
    function updateFromTransaction(
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external;

    /**
     * @dev Get the payment badges for the given informations
     */
    function getPaymentBadge(uint256 _podcastId)
        external
        returns (uint64, address);
}
