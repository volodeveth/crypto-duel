// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract GameHubV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    enum GameMode { DUEL, BR5, BR100, BR1000 }
    
    struct Duel {
        uint256 id;
        address player1;
        address player2;
        uint256 betAmount;
        uint256 timestamp;
        address winner;
        bool completed;
        uint256 randomSeed;
    }
    
    struct BattleRoyale {
        uint256 id;
        GameMode mode;
        address[] players;
        uint256 betAmount;
        uint256 startTime;
        address winner;
        bool completed;
        uint256 randomSeed;
        uint256 requiredPlayers;
    }
    
    struct WaitingPlayer {
        address player;
        uint256 betAmount;
        GameMode mode;
        uint256 joinTime;
        bool active;
    }
    
    // State variables
    uint256 public totalDuels;
    uint256 public totalBattleRoyales;
    uint256 public randomNonce;
    uint256 public constant OWNER_FEE_PERCENT = 10; // 10% fee
    
    // Mappings
    mapping(uint256 => Duel) public duels;
    mapping(uint256 => BattleRoyale) public battleRoyales;
    mapping(uint256 => WaitingPlayer) public waitingPlayers;
    
    // Waiting queues: mode => betAmount => waitingIds
    mapping(GameMode => mapping(uint256 => uint256[])) public waitingByModeAndBet;
    
    // ID counters
    uint256 public nextDuelId;
    uint256 public nextBattleRoyaleId;
    uint256 public nextWaitingId;
    
    // Allowed bet amounts in wei (same as V1)
    uint256[] public allowedBets;
    
    // Events
    event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount, GameMode mode);
    event DuelStarted(uint256 indexed duelId, address player1, address player2, uint256 betAmount);
    event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed);
    event BattleRoyaleStarted(uint256 indexed battleId, GameMode mode, uint256 playersCount, uint256 betAmount);
    event BattleRoyaleCompleted(uint256 indexed battleId, address winner, uint256 prize, uint256 randomSeed);
    event PaymentSent(address to, uint256 amount);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        nextDuelId = 1;
        nextBattleRoyaleId = 1;
        nextWaitingId = 1;
        randomNonce = block.timestamp;
        
        // Initialize allowed bets (same as V1)
        allowedBets = [
            10000000000000,    // 0.00001 ETH
            100000000000000,   // 0.0001 ETH  
            1000000000000000,  // 0.001 ETH
            10000000000000000  // 0.01 ETH
        ];
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function isValidBet(uint256 amount) public view returns (bool) {
        for (uint256 i = 0; i < allowedBets.length; i++) {
            if (allowedBets[i] == amount) return true;
        }
        return false;
    }
    
    function getRequiredPlayers(GameMode mode) public pure returns (uint256) {
        if (mode == GameMode.DUEL) return 2;
        if (mode == GameMode.BR5) return 5;
        if (mode == GameMode.BR100) return 100;
        if (mode == GameMode.BR1000) return 1000;
        return 0;
    }
    
    function getMultiplier(GameMode mode) public pure returns (uint256) {
        if (mode == GameMode.DUEL) return 180; // 1.8x (90% of 2x pool)
        if (mode == GameMode.BR5) return 450;  // 4.5x (90% of 5x pool)
        if (mode == GameMode.BR100) return 9000; // 90x (90% of 100x pool)
        if (mode == GameMode.BR1000) return 90000; // 900x (90% of 1000x pool)
        return 0;
    }
    
    function joinGame(GameMode mode) external payable {
        require(isValidBet(msg.value), "Invalid bet amount");
        require(msg.value > 0, "Must send ETH");
        require(mode != GameMode.DUEL || mode == GameMode.DUEL, "Invalid game mode");
        
        if (mode == GameMode.DUEL) {
            joinDuel();
        } else {
            joinBattleRoyale(mode);
        }
    }
    
    function joinDuel() internal {
        // Look for opponent with same bet amount in DUEL mode
        uint256 opponentId = findWaitingOpponent(GameMode.DUEL, msg.value);
        
        if (opponentId > 0) {
            // Found opponent - start duel
            WaitingPlayer storage opponent = waitingPlayers[opponentId];
            startDuel(opponent.player, msg.sender, msg.value);
            
            // Remove from waiting
            opponent.active = false;
            removeFromWaitingList(GameMode.DUEL, msg.value, opponentId);
        } else {
            // Add to waiting list
            addToWaitingList(GameMode.DUEL, msg.value);
        }
    }
    
    function joinBattleRoyale(GameMode mode) internal {
        uint256 requiredPlayers = getRequiredPlayers(mode);
        uint256 currentWaiting = getWaitingPlayersCount(mode, msg.value);
        
        if (currentWaiting + 1 >= requiredPlayers) {
            // Enough players - start battle royale
            startBattleRoyale(mode, msg.value);
        } else {
            // Add to waiting list
            addToWaitingList(mode, msg.value);
        }
    }
    
    function addToWaitingList(GameMode mode, uint256 betAmount) internal {
        uint256 waitingId = nextWaitingId++;
        waitingPlayers[waitingId] = WaitingPlayer({
            player: msg.sender,
            betAmount: betAmount,
            mode: mode,
            joinTime: block.timestamp,
            active: true
        });
        
        waitingByModeAndBet[mode][betAmount].push(waitingId);
        emit PlayerWaiting(waitingId, msg.sender, betAmount, mode);
    }
    
    function findWaitingOpponent(GameMode mode, uint256 betAmount) internal view returns (uint256) {
        uint256[] storage waitingList = waitingByModeAndBet[mode][betAmount];
        for (uint256 i = 0; i < waitingList.length; i++) {
            uint256 waitingId = waitingList[i];
            if (waitingPlayers[waitingId].active && 
                waitingPlayers[waitingId].player != msg.sender) {
                return waitingId;
            }
        }
        return 0;
    }
    
    function startDuel(address player1, address player2, uint256 betAmount) internal {
        randomNonce++;
        
        // Generate fair random
        uint256 randomSeed = generateRandom();
        uint256 winnerIndex = randomSeed % 2;
        address winner = winnerIndex == 0 ? player1 : player2;
        
        uint256 duelId = nextDuelId++;
        duels[duelId] = Duel({
            id: duelId,
            player1: player1,
            player2: player2,
            betAmount: betAmount,
            timestamp: block.timestamp,
            winner: winner,
            completed: true,
            randomSeed: randomSeed
        });
        
        // Prize distribution (same as V1)
        uint256 totalPool = betAmount * 2;
        uint256 ownerFee = (totalPool * OWNER_FEE_PERCENT) / 100;
        uint256 winnerPrize = totalPool - ownerFee;
        
        // Transfer funds
        payable(winner).transfer(winnerPrize);
        payable(owner()).transfer(ownerFee);
        
        totalDuels++;
        
        emit DuelStarted(duelId, player1, player2, betAmount);
        emit DuelCompleted(duelId, winner, winnerPrize, randomSeed);
        emit PaymentSent(winner, winnerPrize);
        emit PaymentSent(owner(), ownerFee);
    }
    
    function startBattleRoyale(GameMode mode, uint256 betAmount) internal {
        uint256 requiredPlayers = getRequiredPlayers(mode);
        uint256[] storage waitingList = waitingByModeAndBet[mode][betAmount];
        
        // Collect all waiting players + current player
        address[] memory players = new address[](requiredPlayers);
        uint256 playerIndex = 0;
        
        // Add current player first
        players[playerIndex++] = msg.sender;
        
        // Add waiting players
        for (uint256 i = 0; i < waitingList.length && playerIndex < requiredPlayers; i++) {
            uint256 waitingId = waitingList[i];
            if (waitingPlayers[waitingId].active) {
                players[playerIndex++] = waitingPlayers[waitingId].player;
                waitingPlayers[waitingId].active = false;
            }
        }
        
        // Clear waiting list
        delete waitingByModeAndBet[mode][betAmount];
        
        // Generate random winner
        randomNonce++;
        uint256 randomSeed = generateRandom();
        uint256 winnerIndex = randomSeed % requiredPlayers;
        address winner = players[winnerIndex];
        
        // Create battle royale record
        uint256 battleId = nextBattleRoyaleId++;
        battleRoyales[battleId] = BattleRoyale({
            id: battleId,
            mode: mode,
            players: players,
            betAmount: betAmount,
            startTime: block.timestamp,
            winner: winner,
            completed: true,
            randomSeed: randomSeed,
            requiredPlayers: requiredPlayers
        });
        
        // Prize distribution
        uint256 totalPool = betAmount * requiredPlayers;
        uint256 ownerFee = (totalPool * OWNER_FEE_PERCENT) / 100;
        uint256 winnerPrize = totalPool - ownerFee;
        
        // Transfer funds
        payable(winner).transfer(winnerPrize);
        payable(owner()).transfer(ownerFee);
        
        totalBattleRoyales++;
        
        emit BattleRoyaleStarted(battleId, mode, requiredPlayers, betAmount);
        emit BattleRoyaleCompleted(battleId, winner, winnerPrize, randomSeed);
        emit PaymentSent(winner, winnerPrize);
        emit PaymentSent(owner(), ownerFee);
    }
    
    function generateRandom() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            block.number,
            msg.sender,
            randomNonce,
            blockhash(block.number - 1),
            gasleft()
        )));
    }
    
    function removeFromWaitingList(GameMode mode, uint256 betAmount, uint256 waitingId) internal {
        uint256[] storage waitingList = waitingByModeAndBet[mode][betAmount];
        for (uint256 i = 0; i < waitingList.length; i++) {
            if (waitingList[i] == waitingId) {
                waitingList[i] = waitingList[waitingList.length - 1];
                waitingList.pop();
                break;
            }
        }
    }
    
    // View functions
    function getWaitingPlayersCount(GameMode mode, uint256 betAmount) public view returns (uint256) {
        uint256 count = 0;
        uint256[] storage waitingList = waitingByModeAndBet[mode][betAmount];
        for (uint256 i = 0; i < waitingList.length; i++) {
            if (waitingPlayers[waitingList[i]].active) {
                count++;
            }
        }
        return count;
    }
    
    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }
    
    function getBattleRoyale(uint256 battleId) external view returns (BattleRoyale memory) {
        return battleRoyales[battleId];
    }
    
    function getAllowedBets() external view returns (uint256[] memory) {
        return allowedBets;
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalGames,
        uint256 wins,
        uint256 totalWinnings
    ) {
        // Count duels
        for (uint256 i = 1; i < nextDuelId; i++) {
            if (duels[i].player1 == player || duels[i].player2 == player) {
                totalGames++;
                if (duels[i].winner == player) {
                    wins++;
                    uint256 totalPool = duels[i].betAmount * 2;
                    uint256 ownerFee = (totalPool * OWNER_FEE_PERCENT) / 100;
                    totalWinnings += totalPool - ownerFee;
                }
            }
        }
        
        // Count battle royales
        for (uint256 i = 1; i < nextBattleRoyaleId; i++) {
            BattleRoyale storage battle = battleRoyales[i];
            bool isParticipant = false;
            for (uint256 j = 0; j < battle.players.length; j++) {
                if (battle.players[j] == player) {
                    isParticipant = true;
                    break;
                }
            }
            if (isParticipant) {
                totalGames++;
                if (battle.winner == player) {
                    wins++;
                    uint256 totalPool = battle.betAmount * battle.requiredPlayers;
                    uint256 ownerFee = (totalPool * OWNER_FEE_PERCENT) / 100;
                    totalWinnings += totalPool - ownerFee;
                }
            }
        }
    }
    
    // Emergency functions
    function cancelWaiting() external {
        for (uint256 i = 1; i < nextWaitingId; i++) {
            if (waitingPlayers[i].player == msg.sender && waitingPlayers[i].active) {
                waitingPlayers[i].active = false;
                payable(msg.sender).transfer(waitingPlayers[i].betAmount);
                removeFromWaitingList(waitingPlayers[i].mode, waitingPlayers[i].betAmount, i);
                return;
            }
        }
        revert("No active waiting found");
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}