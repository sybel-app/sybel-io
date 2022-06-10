// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./libs/SybBadgeCalculator.sol";
import "./interfaces/IListenerBadges.sol";
import "./models/ListenerBadge.sol";

/**
 * @dev Handle the computation of our listener badges
 */
contract ListenerBadges is IListenerBadges, Pausable, Ownable {

    // Map of user address to listener badge
    mapping(address => ListenerBadge) listenerBadges;


    /**
    * @dev Update the listener snft amount
    */
    function updateCoefficient(address listener, uint coefficient) external override onlyOwner whenNotPaused {
        listenerBadges[listener].coefficient = coefficient;
    }

    /**
    * @dev Update the listener snft amount
    */
    function updateSnftAmount(address listener, uint sNftamount) external override onlyOwner whenNotPaused {
        listenerBadges[listener].sNftOwnedCount = sNftamount;
    }

    /**
    * @dev Find the badge for the given lsitener
    */
    function getBadge(address listener) external override view returns (ListenerBadge memory) {
        return listenerBadges[listener];
    }

    /**
     * @dev Pause the contracts
     */
    function pause() external override onlyOwner {
        // Pause this contract
        _pause();
    }

    /**
     * @dev Resume the contracts
     */
    function unpause() external override onlyOwner {
        // Un pause this contract
        _unpause();
    }
}
