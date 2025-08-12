// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DuelGame {
    address public owner;
    uint256 public totalDuels;
    uint256 public randomNonce;
    
    // Owner fee (20% of pool = 10% from each bet)
    uint256 public constant OWNER_FEE_PERCENT = 10; // 10% from each bet = 20% from winnings
    
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
    
    struct WaitingPlayer {
        address player;
        uint256 betAmount;
        uint256 joinTime;
        bool active;
    }
    
    mapping(uint256 => Duel) public duels;
    mapping(uint256 => WaitingPlayer) public waitingPlayers;
    mapping(uint256 => uint256[]) public waitingByBet; // bet amount => waiting IDs
    
    uint256 public nextDuelId = 1;
    uint256 public nextWaitingId = 1;
    
    // Allowed bet amounts in wei
    uint256[] public allowedBets = [
        10000000000000,    // 0.00001 ETH
        100000000000000,   // 0.0001 ETH  
        1000000000000000,  // 0.001 ETH
        10000000000000000  // 0.01 ETH
    ];
    
    event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount);
    event DuelStarted(uint256 indexed duelId, address player1, address player2, uint256 betAmount);
    event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed);
    event PaymentSent(address to, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        randomNonce = block.timestamp;
    }
    
    function isValidBet(uint256 amount) public view returns (bool) {
        for (uint256 i = 0; i < allowedBets.length; i++) {
            if (allowedBets[i] == amount) return true;
        }
        return false;
    }
    
    function joinDuel() external payable {
        require(isValidBet(msg.value), "Invalid bet amount");
        require(msg.value > 0, "Must send ETH");
        
        // Look for opponent with same bet amount
        uint256 opponentId = findWaitingOpponent(msg.value);
        
        if (opponentId > 0) {
            // Found opponent - start duel
            WaitingPlayer storage opponent = waitingPlayers[opponentId];
            startDuel(opponent.player, msg.sender, msg.value);
            
            // Remove from waiting
            opponent.active = false;
            removeFromWaitingList(msg.value, opponentId);
        } else {
            // Add to waiting list
            uint256 waitingId = nextWaitingId++;
            waitingPlayers[waitingId] = WaitingPlayer({
                player: msg.sender,
                betAmount: msg.value,
                joinTime: block.timestamp,
                active: true
            });
            
            waitingByBet[msg.value].push(waitingId);
            emit PlayerWaiting(waitingId, msg.sender, msg.value);
        }
    }
    
    function findWaitingOpponent(uint256 betAmount) internal view returns (uint256) {
        uint256[] storage waitingList = waitingByBet[betAmount];
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
        uint256 randomSeed = generateRandom(player1, player2);
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
        
        // Prize distribution
        uint256 totalPool = betAmount * 2;
        uint256 ownerFee = (totalPool * OWNER_FEE_PERCENT) / 100;
        uint256 winnerPrize = totalPool - ownerFee;
        
        // Transfer funds
        payable(winner).transfer(winnerPrize);
        payable(owner).transfer(ownerFee);
        
        totalDuels++;
        
        emit DuelStarted(duelId, player1, player2, betAmount);
        emit DuelCompleted(duelId, winner, winnerPrize, randomSeed);
        emit PaymentSent(winner, winnerPrize);
        emit PaymentSent(owner, ownerFee);
    }
    
    function generateRandom(address player1, address player2) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.prevrandao,           // ETH 2.0 beacon chain randomness
            block.timestamp,
            block.number,
            player1,
            player2,
            randomNonce,
            blockhash(block.number - 1),
            gasleft()                   // Additional entropy from gas
        )));
    }
    
    function removeFromWaitingList(uint256 betAmount, uint256 waitingId) internal {
        uint256[] storage waitingList = waitingByBet[betAmount];
        for (uint256 i = 0; i < waitingList.length; i++) {
            if (waitingList[i] == waitingId) {
                waitingList[i] = waitingList[waitingList.length - 1];
                waitingList.pop();
                break;
            }
        }
    }
    
    // View functions
    function getWaitingPlayersCount(uint256 betAmount) external view returns (uint256) {
        uint256 count = 0;
        uint256[] storage waitingList = waitingByBet[betAmount];
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
    
    function getAllowedBets() external view returns (uint256[] memory) {
        return allowedBets;
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalGames,
        uint256 wins,
        uint256 totalWinnings
    ) {
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
    }
    
    // Emergency functions
    function cancelWaiting() external {
        for (uint256 i = 1; i < nextWaitingId; i++) {
            if (waitingPlayers[i].player == msg.sender && waitingPlayers[i].active) {
                waitingPlayers[i].active = false;
                payable(msg.sender).transfer(waitingPlayers[i].betAmount);
                removeFromWaitingList(waitingPlayers[i].betAmount, i);
                return;
            }
        }
        revert("No active waiting found");
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}