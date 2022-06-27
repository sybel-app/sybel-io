// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IMinter.sol";
import "../badges/access/PaymentBadgesAccessor.sol";
import "../utils/SybelMath.sol";
import "../tokens/SybelInternalTokens.sol";
import "../tokens/TokenSybelEcosystem.sol";
import "../utils/MintingAccessControlUpgradeable.sol";

/**
 * @dev Represent our minter contract
 */
/// @custom:security-contact crypto-support@sybel.co
contract Minter is
    IMinter,
    MintingAccessControlUpgradeable,
    PaymentBadgesAccessor
{
    // The cap for each mintable token type
    uint256 public constant TOKEN_LEGENDARY_CAP = 10;
    uint256 public constant TOKEN_EPIC_CAP = 50;
    uint256 public constant TOKEN_RARE_CAP = 200;
    uint256 public constant TOKEN_CLASSIC_CAP = 1000;

    /**
     * @dev Access our internal tokens
     */
    SybelInternalTokens private sybelInternalTokens;

    /**
     * @dev Access our governance token
     */
    TokenSybelEcosystem private tokenSybelEcosystem;

    /**
     * @dev Event emitted when a new podcast is minted
     */
    event PodcastMinted(
        uint256 baseId,
        uint256 classicAmount,
        uint256 rareAmount,
        uint256 epicAmount,
        uint256 legendaryAmount,
        address owner
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address tseAddr,
        address internalTokenAddr,
        address listenerBadgesAddr,
        address podcastBadgesAddr
    ) public initializer {
        super.initialize();
        _PaymentBadgesAccessor_init(listenerBadgesAddr, podcastBadgesAddr);

        // TODO : Add initial ratio and earn multiplier ??

        sybelInternalTokens = SybelInternalTokens(internalTokenAddr);
        tokenSybelEcosystem = TokenSybelEcosystem(tseAddr);
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        uint256 _legendarySupply,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external override onlyMinter whenNotPaused {
        require(
            _classicSupply > 0,
            "SYB: Cannot add podcast without classic supply !"
        );
        require(
            _classicSupply <= TOKEN_CLASSIC_CAP,
            "SYB: Cannot add podcast with that much classic supply !"
        );
        require(
            _rareSupply <= TOKEN_RARE_CAP,
            "SYB: Cannot add podcast with that much rare supply !"
        );
        require(
            _epicSupply <= TOKEN_EPIC_CAP,
            "SYB: Cannot add podcast with that much epic supply !"
        );
        require(
            _legendarySupply <= TOKEN_LEGENDARY_CAP,
            "SYB: Cannot add podcast with that much legendary supply !"
        );
        // Try to mint the podcast
        uint256 podcastId = sybelInternalTokens.mintPodcast(
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _legendarySupply,
            _data,
            _podcastOwnerAddress
        );
        // Emit the event
        emit PodcastMinted(
            podcastId,
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _legendarySupply,
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
    ) external override onlyMinter whenNotPaused {
        // TODO : Call the cost badges to determine the prices
        // TODO : Check the to wallet, if he have enough supply
        // TODO : Burn it's TSE associated to the cost
        // TBD : Ask matt for computation rules
        // Ask the internal tokens
        sybelInternalTokens.mint(_to, _id, _amount);
    }
}
