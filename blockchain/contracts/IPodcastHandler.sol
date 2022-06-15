// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./utils/pausable/IPausable.sol";

/**
 * @dev Represent our podcast handler contract
 */
interface IPodcastHandler is IPausable {
    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external;

    /**
     * @dev Pause all the contracts
     */
    function pauseAll() external;

    /**
     * @dev Resume all the contracts
     */
    function unPauseAll() external;
}
