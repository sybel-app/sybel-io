// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./utils/SybelMath.sol";
import "./utils/pausable/OwnerPausable.sol";
import "./badges/IListenerBadges.sol";
import "./badges/IPodcastBadges.sol";
import "./IPodcastHandler.sol";
import "./badges/ListenerBadges.sol";
import "./badges/PodcastBadges.sol";
import "./badges/accessor/BadgeAccessor.sol";
import "./tokens/ITokenProvider.sol";
import "./tokens/InternalTokens.sol";

/**
 * @dev Podcast handler contract, represent the entry point of our d apps
 */
contract PodcastHandler is IPodcastHandler, BadgeAccessor, OwnerPausable {
    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private OWNER_LISTEN_REWARD = SybelMath.DECIMALS / 10; // So 0.1 TSE
    uint256 private OWNER_PUBLISH_REWARD = SybelMath.DECIMALS; // So 1 TSE

    // Our coefficient, should be updatable (and moved to the listener and podcast badges directly ?)
    uint256 private constant SYBEL_COEFFICIENT = 250;

    /**
     * @dev Access our token provider
     */
    ITokenProvider public tokenProvider;

    constructor() {
        // Create our initial badges contracts
        listenerBadges = new ListenerBadges();
        podcastBadges = new PodcastBadges();
        // Create our initial token provider contract
        tokenProvider = new InternalTokens();
        // Update the address of the badges in the token provider
        tokenProvider.updateAllBadgesAddress(address(listenerBadges), address(podcastBadges));
    }

    /**
     * @dev Add a new podcast to our eco system
     */
    function addPodcast(
        uint256 _classicSupply,
        uint256 _rareSupply,
        uint256 _epicSupply,
        string memory _name,
        bytes calldata _data,
        address _podcastOwnerAddress
    ) external override onlyOwner whenNotPaused {}

    /**
     * @dev Pay a group of user listening
     */
    function payUserListen(
        address[] calldata _listenerAddresses,
        uint256[] calldata _listenCounts
    ) external override onlyOwner whenNotPaused {}

    /**
     * @dev Pay a group of podcast owner
     */
    function payPodcastOwner(
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external override onlyOwner whenNotPaused {}

    /**
     * @dev Pause all the contracts
     */
    function pauseAll() external override onlyOwner {
        // Pause the badges calculation
        // Pause the badges calculation
        listenerBadges.pause();
        podcastBadges.pause();
        // Pause the token provider
        // Pause this contract
        _pause();
    }

    /**
     * @dev Resume all the contracts
     */
    function unPauseAll() external override onlyOwner {
        // Pause the badges calculation
        listenerBadges.unpause();
        podcastBadges.unpause();
        // Pause the token provider
        // Un Pause this contract
        _unpause();
    }
}

/**
 * Should expose interface : 
    Mint podcast (with param : name, supply of each tokens, owner address)
    Pay podcast owner (with param : podcastId, listenCount)
    Pay listener (with param : listenerWallet, listenCount) -> alias for claimListen(listenCount) directly called from a listener ?? Consume a bit of matic, so TSE burning for matic in wallet ?
        Can be a burning reason -> faster payment, and not waiting for batching operation
    Mint podcast nft (with params: podcastId, type, supply, receiver address)
    Podcast sNFT should implement royalties ??
    
    For podcast minting, we should mint the podcast NFT (representing the owner of a podcast), then set the total supply of each token

    For owner and listener payment, we should compute the badge (from the erc1155 contract ?? Or separate contract that erc1155 feed and that podcast handler read ???)
 */
