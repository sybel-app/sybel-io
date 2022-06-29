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
    function updateBadge(uint256 podcastId, uint64 coefficient) external;

    /**
     * @dev Update the badges from a transaction record (so just check if the owner of a podcast changed)
     */
    function updateFromTransaction(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external;

    /**
     * @dev Get the payment badges for the given informations
     */
    function getPaymentBadge(uint256 podcastId)
        external
        returns (uint64, address);
}
