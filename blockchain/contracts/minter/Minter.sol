// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IMinter.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/pausable/AccessControlPausable.sol";
import "../utils/SybelMath.sol";
import "../tokens/InternalTokens.sol";
import "../tokens/GovernanceToken.sol";

/**
 * @dev Represent our minter contract
 */
contract Minter is IMinter, AccessControlPausable, PaymentBadgesAccessor {
    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private OWNER_LISTEN_REWARD = SybelMath.DECIMALS / 10; // So 0.1 TSE

    // Our coefficient, should be updatable (and moved to the listener and podcast badges directly ?)
    uint256 private constant SYBEL_COEFFICIENT = 250;

    // Maximum data we can treat in a batch manner
    uint256 private constant MAX_BATCH_AMOUNT = 20;

    /**
     * @dev Access our internal token
     */
    InternalTokens private internalTokens;

    /**
     * @dev Access our governance token
     */
    GovernanceToken private governanceToken;

    /**
     * @dev Build our podcast handler from the deployed governance and internal token contracts
     */
    constructor(address governanceTokenAddr, address internalTokenAddr) {
        // Find our internal token provider contract
        internalTokens = InternalTokens(internalTokenAddr);
        // Find our governance token provider contract
        governanceToken = GovernanceToken(governanceTokenAddr);
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        // Try to mint the podcast
        uint256 podcastId = internalTokens.mintPodcast(
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _data,
            _podcastOwnerAddress
        );
        // TODO : Do something with the podcast id ? Pay the podcaster directly ??
        // TODO : Call the rewarder contract to pay the creator ??
    }

    /**
     * @dev Mint a new s nft
     */
    function mintSNFT(
        uint256 _id,
        address _to,
        uint256 _amount
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        // TODO : Call the cost badges to determine the prices
        // TODO : Check the to wallet, if he have enough supply
        // TODO : Burn it's TSE associated to the cost
        // TBD : Ask matt for computation rules
        // Ask the internal tokens
        internalTokens.mintSNft(_to, _id, _amount);
    }
}
