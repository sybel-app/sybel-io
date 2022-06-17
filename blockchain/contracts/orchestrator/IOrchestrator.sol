// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/pausable/IPausable.sol";

/**
 * @dev Represent our orchestrator contract, reponsable for global address updating, global pausing etc
 */
interface IOrchestrator is IPausable {
    /**
     * @dev Update our rewarder contract
     */
    function updateRewarder(address newRewarderAddr) external;

    /**
     * @dev Update our minter contract
     */
    function updateMinter(address newMinterAddr) external;

    /**
     * @dev Update our updater contract
     */
    function updateUpdater(address newUpdaterAddr) external;

    /**
     * @dev Update our listener badges address
     */
    function updateListenerBadgesAddress(address newAddress) external;

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress) external;
}
