// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./utils/SybelMath.sol";
import "./utils/SybelRoles.sol";
import "./utils/pausable/OwnerPausable.sol";
import "./badges/IListenerBadges.sol";
import "./badges/IPodcastBadges.sol";
import "./IPodcastHandler.sol";
import "./badges/ListenerBadges.sol";
import "./badges/PodcastBadges.sol";
import "./badges/accessor/OwnableBadgeAccessor.sol";
import "./tokens/InternalTokens.sol";
import "./tokens/GovernanceToken.sol";

/**
 * @dev Podcast handler contract, represent the entry point of our d apps
  * Deployment Steps : 
  1 - deploy governance and internal tokens
  2 - deploy podcast handler with governance and internal tokens address as param
  3 - grand the minter and addr updater role to the podcast handler contract in the internal tokens
  4 - call the updateBadgesAddrOnInnerContract() on the podcast handler contract (it will refresh the badges address, and associate the right roles)
  5 - you're (theorically) ready to goooo
 */
contract PodcastHandler is
    IPodcastHandler,
    OwnableBadgeAccessor,
    OwnerPausable
{
    // Our base reward amount for podcast listen and owner
    uint256 private constant USER_LISTEN_REWARD = 10**3; // So 0.001 TSE
    uint256 private OWNER_LISTEN_REWARD = SybelMath.DECIMALS / 10; // So 0.1 TSE
    uint256 private OWNER_PUBLISH_REWARD = SybelMath.DECIMALS; // So 1 TSE

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
        // Create our initial badges contracts
        listenerBadges = new ListenerBadges();
        podcastBadges = new PodcastBadges();
        // Find our internal token provider contract
        internalTokens = InternalTokens(internalTokenAddr);
        // Find our governance token provider contract
        governanceToken = GovernanceToken(governanceTokenAddr);
        // Grand the updater roles on our governance token for the badges contract
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokenAddr)
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokenAddr)
        );
    }

    /**
     * @dev Update the address of the badges computer on governance token
     * Should be call after a deployment, when this address contract as been granted the podcast updater role
     */
    function updateBadgesAddrOnInnerContract()
        external
        onlyOwner
        whenNotPaused
    {
        // Update the address for the different badges
        internalTokens.updateListenerBadgesAddress(address(listenerBadges));
        internalTokens.updatePodcastBadgesAddress(address(podcastBadges));
        // Grand the roles
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }

    function updateInternalTokenAddress(address _newInternalTokenAddress) external {
        // Find our internal token provider contract
        internalTokens = InternalTokens(_newInternalTokenAddress);
        // Grand the updater roles on our governance token for the badges contract
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            _newInternalTokenAddress
        );
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            _newInternalTokenAddress
        );
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
    ) external override onlyOwner whenNotPaused {
        // Try to mint the podcast
        uint256 podcastId = internalTokens.mintPodcast(
            _classicSupply,
            _rareSupply,
            _epicSupply,
            _data,
            _podcastOwnerAddress
        );
        // TODO : Do something with the podcast id ? Pay the podcaster directly ??
    }

    /**
     * @dev Pay a group of user listening
     */
    function payUserListen(
        address[] calldata _listenerAddresses,
        uint256[] calldata _listenCounts
    ) external override onlyOwner whenNotPaused {
        require(
            _listenerAddresses.length == _listenCounts.length,
            "SYB: Can't pay for listeners address and listen of different length"
        );
        require(
            _listenerAddresses.length <= MAX_BATCH_AMOUNT,
            "SYB: Can't treat more than 20 items at a time"
        );
        // Iterate over each user
        for (uint256 i = 0; i < _listenerAddresses.length; ++i) {
            uint256 amountToPay = USER_LISTEN_REWARD *
                listenerBadges.getMultiplier(_listenerAddresses[i]);
            _listenCounts[i];
            // Mint the given token's
            internalTokens.mintUtility(_listenerAddresses[i], amountToPay);
        }
    }

    /**
     * @dev Pay a group of podcast owner
     */
    function payPodcastOwner(
        uint256[] calldata _podcastIds,
        uint256[] calldata _listenCounts
    ) external override onlyOwner whenNotPaused {
        require(
            _podcastIds.length == _listenCounts.length,
            "SYB: Can't pay of podcast for id and listen of different length"
        );
        require(
            _podcastIds.length <= MAX_BATCH_AMOUNT,
            "SYB: Can't treat more than 20 items at a time"
        );
        // Iterate over each podcast
        for (uint256 i = 0; i < _podcastIds.length; ++i) {
            uint256 amountToPay = OWNER_LISTEN_REWARD *
                podcastBadges.getMultiplier(_podcastIds[i]) *
                _listenCounts[i];
            // Mint the given token's
            internalTokens.mintUtility(
                podcastBadges.getOwner(_podcastIds[i]),
                amountToPay
            );
        }
    }

    /**
     * @dev Pause all the contracts
     */
    function pauseAll() external override onlyOwner {
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

    /**
     * @dev Update our listener badges address
     * Overrided to grant the role for the governance token to update the value
     */
    function updateListenerBadgesAddress(address newAddress)
        external
        override
        onlyOwner
    {
        // Update the current address
        listenerBadges = IListenerBadges(newAddress);

        // Update the address for the internal tokens, and set the right roles
        internalTokens.updateListenerBadgesAddress(address(listenerBadges));
        listenerBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
    }

    /**
     * @dev Update our podcast badges address
     */
    function updatePodcastBadgesAddress(address newAddress)
        external
        override
        onlyOwner
    {
        // Update the current address
        podcastBadges = IPodcastBadges(newAddress);

        // Update the address for the internal tokens, and set the right roles
        internalTokens.updatePodcastBadgesAddress(address(podcastBadges));
        podcastBadges.grantRole(
            SybelRoles.BADGE_UPDATER_ROLE,
            address(internalTokens)
        );
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
