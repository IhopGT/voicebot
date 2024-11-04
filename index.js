const { myUserConfig } = require('C:\\Users\\reape\\Documents\\BotShit\\Config.js');
const say = require('say'); // for text to speech
const { Client } = require('att-client'); // main att client 
const utility = require('./utility.js'); // for utility functions
const { homedir, type } = require('os');
const readline = require('readline');
const Fuse = require('fuse.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { connect } = require('http2');



// Configuration
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const phantomList = [];

const autoResponses = [];
const bot = new Client(myUserConfig); // ATT client
let server_id = 313523514;

let owner = 'hyg'; // owner id
let target = '';
let PlayerDic = {};
let connection; // Global connection variable
const stats = ['health', 'hunger', 'speed', 'playerweight', 'damage', 'frost', 'nightmare', 'damageprotection', 'fullness'];

let messageContent = '';


// Function to refresh the player dictionary
function refreshPlayerDic() {
  PlayerDic = connection.server.players.reduce((acc, player, index) => {
    acc[index] = player.username.replace(' ', '')
    return acc;
  }, {});
}

// Read the message from the file and store it in `messageContent`
fs.readFile('C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\beemoviescript.txt', 'utf8', (err, data) => {
  if (err) {
    
    return;
  }
  messageContent = data;
 
});

async function askInitialQuestion() {
  rl.question('Choose an option: 1 for magic, 2 for divided: ', async (answer) => {
    if (answer === '1') {
      server_id = 313523514; // Set the server ID for "magic"
      console.log("Server ID set to Magic's server.");
    } else if (answer === '2') {
      server_id = 667968435; // Set the server ID for "divided"
      console.log("Server ID set to Divided's server.");
    } else {
      console.log("Invalid option. Please choose either 1 (magic) or 2 (divided).");
      askInitialQuestion(); // Re-prompt if invalid input
      return;
    }

    await main(); // Start the bot after setting the server ID
    wait(10000); // Wait before connecting
  });
}
askInitialQuestion();




// Main function
async function main() {
  await bot.start(); // Call the start method as a function and wait for it to complete
}




function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Bot events
bot.on('ready', async () => {
  try {
    console.log(`connecting to ${server_id}}`)
    bot.openServerConnection(server_id)
  } catch (Failure) {
    console.error(Failure);
  }
});


bot.on('connect', async conn => {
  connection = conn; // Update the global connection variable
  console.log(`Bot Turned On Successfully On ${connection.server.name}`);

  connection.send(`player message ${owner} "Vision Is On In ${connection.server.name}" 4`);




// Configuration and constants
const DimensionCoordinates = [617.1129, 198.334885, 1339.08508];
const SealingItemPrefabHash = 61670; // Example item prefab hash
let playersInPocketDimension = []; // Tracks players currently in the pocket dimension
let ownerInDimension = false; // Tracks if the owner is in the dimension

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Main function to manage pocket dimension interactions
function pocketDimensionManager() {

    // Fetch detailed player list
    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;
        
        if (!Array.isArray(players)) {
            return;
        }

        // Identify the owner by matching the player with the owner variable's name
        const ownerPlayer = players.find(player => player.username === owner); 
        if (!ownerPlayer) {
            return;
        }

        // Check if the owner holds the required item
        checkOwnerInventory(ownerPlayer.id).then(isHoldingSealingItem => {
            if (!isHoldingSealingItem) {
                return;
            }

            // Loop through all players and handle dimension interactions
            players.forEach(player => {
                const isOwner = player.username === ownerPlayer.username;
                const isInDimension = playersInPocketDimension.includes(player.id);

                if (isOwner) {
                    handleOwnerDimensionEntryExit(ownerPlayer);
                } else if (isInDimension) {
                    handlePlayerReturnOrFreedom(player, ownerPlayer);
                } else {
                    const isNearby = checkHandToHeadProximity(ownerPlayer, player);
                    if (isNearby) {
                        teleportToDimension(player.id);
                        playersInPocketDimension.push(player.id);

                        // Send message to the player
                        connection.send(`player message ${player.id} "you have been stored in my pokeball"`);

                        // Notify the owner
                        connection.send(`player message ${ownerPlayer.id} "player ${player.username} is now in pokeball"`);
                    }
                }
            });
        }).catch(error => {});
    }).catch(error => {});
}

// Function to manage owner's entry and exit from the pocket dimension
function handleOwnerDimensionEntryExit(ownerPlayer) {
    // Check if the owner's hand holding the item is close to their face
    const rightHandToHeadDist = calculateDistance(ownerPlayer.RightHandPosition, ownerPlayer.HeadPosition);
    const leftHandToHeadDist = calculateDistance(ownerPlayer.LeftHandPosition, ownerPlayer.HeadPosition);
    
    // Check if either hand is close to the head (within 0.15 distance) to enter/exit the dimension
    const isItemNearFace = rightHandToHeadDist <= 0.15 || leftHandToHeadDist <= 0.15;

    if (isItemNearFace && !ownerInDimension) {
        // Enter the pocket dimension
        teleportToDimension(ownerPlayer.id);
        connection.send(`player message ${ownerPlayer.id} "You have entered the Pocket Dimension."`);
        ownerInDimension = true;
    } else if (isItemNearFace && ownerInDimension) {
        // Exit the pocket dimension
        returnToHome(ownerPlayer.id);
        connection.send(`player message ${ownerPlayer.id} "You have exited the Pocket Dimension."`);
        ownerInDimension = false;
    }
}

// Function to handle returning or freeing players in the pocket dimension
function handlePlayerReturnOrFreedom(player, ownerPlayer) {
    const isNearby = checkHandToHeadProximity(ownerPlayer, player);

    if (isNearby) {
        // Set the player free
        setPlayerFree(player.id);
        connection.send(`player message ${player.id} "You have been set free from the Pocket Dimension!"`);
    } else {
        // Return player to the dimension if not near the owner’s hand
        teleportToDimension(player.id);
        connection.send(`player message ${player.id} "You are returned to the Pocket Dimension."`);
    }
}

// Function to check if the owner's hand is close to another player's head
function checkHandToHeadProximity(ownerPlayer, targetPlayer) {
    const leftHandDist = calculateDistance(ownerPlayer.LeftHandPosition, targetPlayer.HeadPosition);
    const rightHandDist = calculateDistance(ownerPlayer.RightHandPosition, targetPlayer.HeadPosition);

    // Check if either hand is close to the target's head (within 0.2 distance)
    return leftHandDist <= 0.2 || rightHandDist <= 0.2;
}

// Function to check if the owner is holding the required item in hand
function checkOwnerInventory(ownerId) {
    return connection.send(`player inventory "${ownerId}"`).then(invResponse => {
        const inventory = invResponse?.data?.Result?.[0];
        if (!inventory) {
            return false;
        }

        const leftHandItem = inventory.LeftHand?.PrefabHash;
        const rightHandItem = inventory.RightHand?.PrefabHash;

        // Return true if either hand holds the required item
        return leftHandItem === SealingItemPrefabHash || rightHandItem === SealingItemPrefabHash;
    });
}

// Function to teleport a player to the pocket dimension
function teleportToDimension(playerId) {
    connection.send(`player set-home ${playerId} ${DimensionCoordinates.join(',')}`);
    connection.send(`player teleport ${playerId} home`);
}

// Function to return a player to their original home
function returnToHome(playerId) {
    connection.send(`player set-home ${playerId} 0,0,0`);
    connection.send(`player teleport ${playerId} home`);
}

// Function to set a player free from the pocket dimension
function setPlayerFree(playerId) {
    returnToHome(playerId);
    playersInPocketDimension = playersInPocketDimension.filter(id => id !== playerId);
}

// Run the pocket dimension manager function every 2.5 seconds
setInterval(() => {
    pocketDimensionManager();
}, 2500);



  


  const streakFilePath = 'C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\streaks.json';
  const jackpotFilePath = 'C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\jackpot.json';
  
  // List of possible items to win
  const items = ['60868', '32850', '32198', '30092', '23012', '24774', '16464', '31034', '23528', '13158'];
  
  // Load streaks and jackpot pool from files
  let playerStreaks = {};
  let jackpotPool = 50; // Default starting jackpot amount
  try {
      playerStreaks = JSON.parse(fs.readFileSync(streakFilePath, 'utf8'));
  } catch (error) {
      console.log("No existing streak file found; initializing new streak data.");
  }
  try {
      jackpotPool = JSON.parse(fs.readFileSync(jackpotFilePath, 'utf8'));
  } catch (error) {
      console.log("No existing jackpot file found; initializing jackpot to default.");
  }
  
  connection.subscribe('TradeDeckUsed', (subscription) => {
      console.log('Subscribed to TradeDeckUsed event');
      const { eventType, data } = subscription;
          // Check if event meets specific conditions
    if (eventType === 'TradeDeckUsed' && data.itemHash === 39484 && data.seller === 1214388459) {
      // Randomly select a stat and generate random values for amount and time
      const stat = stats[Math.floor(Math.random() * stats.length)];
      const amount = getRandom(-255, 255);
      const time = getRandom(1, 255);
  
      // Execute the modify-stat command with the buyer's ID
      connection.send(`player modify-stat ${data.buyer} ${stat} ${amount} ${time} true`);
      console.log(`user ${data.buyer} got ${stat} with ${amount} for ${time}`);
      connection.send(`player message ${data.buyer} "you have been given ${stat} ${amount} for ${time}" 10`)
    }
      // Check for specific itemHash and seller
      if (eventType === 'TradeDeckUsed' && data.itemHash === 49578 && data.seller === 1830246809) {
          const betAmount = 10; // Fixed bet amount of 10 coins
          const buyerId = data.buyer;
  
          // Initialize streak if it doesn't exist
          if (!playerStreaks[buyerId]) {
              playerStreaks[buyerId] = { winStreak: 0, lossStreak: 0 };
          }
  
          // Check balance and ensure no negative balance
          console.log(`Checking balance for user ${buyerId}`);
          connection.send(`trade atm get ${buyerId}`, (response) => {
              const buyerBalance = response.value;
              const amountToTake = buyerBalance >= betAmount ? betAmount : buyerBalance;
              let resultMessage = "";
  
              if (amountToTake > 0) {
                  console.log(`Deducting ${amountToTake} coins from user ${buyerId}. Current balance: ${buyerBalance}`);
                  connection.send(`trade atm add ${buyerId} -${amountToTake}`);
                  
                  // Check for a rare item win
                  const itemWinChance = Math.random();
                  if (itemWinChance < 0.02) {  // 2% chance to win an item
                      const itemId = items[Math.floor(Math.random() * items.length)];
                      const itemAmount = Math.floor(Math.random() * 7) + 1; // Random amount between 1 and 7
                      connection.send(`trade post ${buyerId} ${itemId} ${itemAmount}`);
                      resultMessage = `Lucky you! You've won ${itemAmount} of item ${itemId}!`;
                      console.log(`User ${buyerId} won an item: ${itemId} x${itemAmount}`);
                  } else {
                      // Normal gambling outcomes if no item win
                      const outcomeChance = Math.random();
                      const streakBonus = playerStreaks[buyerId].winStreak * 0.05 * betAmount;
                      const lossPenalty = playerStreaks[buyerId].lossStreak > 2 ? 0.9 : 1;
  

                      if (outcomeChance < 0.4 * lossPenalty) {
                          jackpotPool += amountToTake;
                          resultMessage = `You lost ${amountToTake} coins. Better luck next time!`;
                          console.log(`User ${buyerId} lost. Added ${amountToTake} coins to jackpot. New jackpot: ${jackpotPool}`);
                          playerStreaks[buyerId].winStreak = 0;
                          playerStreaks[buyerId].lossStreak += 1;
                      } else if (outcomeChance < 0.65) {
                          resultMessage = `You broke even and won back your ${amountToTake} coins.`;
                          console.log(`User ${buyerId} broke even.`);
                          playerStreaks[buyerId].winStreak = 0;
                          playerStreaks[buyerId].lossStreak = 0;
                      } else if (outcomeChance < 0.85) {
                          const winnings = betAmount * 2 + streakBonus;
                          resultMessage = `Nice win! You doubled your bet to ${winnings} coins, with a bonus of ${streakBonus}!`;
                          connection.send(`trade atm add ${buyerId} ${winnings}`);
                          console.log(`User ${buyerId} won double. Total winnings: ${winnings}`);
                          playerStreaks[buyerId].winStreak += 1;
                          playerStreaks[buyerId].lossStreak = 0;
                      } else if (outcomeChance < 0.95) {
                          const winnings = betAmount * 3 + streakBonus;
                          resultMessage = `Great job! You've tripled your bet to ${winnings} coins, plus a streak bonus of ${streakBonus}!`;
                          connection.send(`trade atm add ${buyerId} ${winnings}`);
                          console.log(`User ${buyerId} won triple. Total winnings: ${winnings}`);
                          playerStreaks[buyerId].winStreak += 1;
                          playerStreaks[buyerId].lossStreak = 0;
                      } else if (outcomeChance < 0.98) {
                          const winnings = betAmount * 5 + streakBonus;
                          resultMessage = `You've hit the mini jackpot with ${winnings} coins, including a streak bonus of ${streakBonus}!`;
                          connection.send(`trade atm add ${buyerId} ${winnings}`);
                          console.log(`User ${buyerId} hit mini jackpot. Total winnings: ${winnings}`);
                          playerStreaks[buyerId].winStreak += 1;
                          playerStreaks[buyerId].lossStreak = 0;
                      } else {
                          const winnings = jackpotPool + streakBonus;
                          resultMessage = `JACKPOT! You've won the jackpot of ${winnings} coins, with a streak bonus of ${streakBonus}!`;
                          connection.send(`trade atm add ${buyerId} ${winnings}`);
                          console.log(`User ${buyerId} won the jackpot! Total winnings: ${winnings}`);
                          jackpotPool = 50;  // Reset jackpot pool after a win
                          playerStreaks[buyerId].winStreak += 1;
                          playerStreaks[buyerId].lossStreak = 0;
                      }
                  }
  
                  // Send result message to the buyer
                  connection.send(`player message ${buyerId} "${resultMessage}" 10`);
                  console.log(`Result for user ${buyerId}: ${resultMessage}`);
              } else {
                  resultMessage = `Insufficient balance. Unable to place a bet of ${betAmount} coins.`;
                  connection.send(`player message ${buyerId} "${resultMessage}" 10`);
                  console.log(`User ${buyerId} has insufficient balance for betting.`);
              }
  
              // Save streak data and jackpot pool to files
              fs.writeFileSync(streakFilePath, JSON.stringify(playerStreaks, null, 2));
              fs.writeFileSync(jackpotFilePath, JSON.stringify(jackpotPool, null, 2));
              console.log(`Updated streaks and jackpot saved. Jackpot pool is now ${jackpotPool}`);
          });
      }
  });
  


  


  setInterval(() => {
    connection.send('player list-detailed').then(resp => {
      try {
        // Loop through the results and perform the necessary checks
        for (let i = 0; i < resp.data.Result.length; i++) {
          for (let k = 0; k < resp.data.Result.length; k++) {
            var head2 = resp.data.Result[k].HeadPosition;
            var lefthand1 = resp.data.Result[i].LeftHandPosition;
            var righthand1 = resp.data.Result[i].RightHandPosition;
  
            var dis = utility.calculateDistance(lefthand1, head2);
            var dis2 = utility.calculateDistance(righthand1, head2);
  
            if (dis2 <= 0.2 && resp.data.Result[i].username == 'Lucid_Divine') {
              connection.send(`player inventory "Lucid_Divine"`).then(response => {
                try {
                  // Attempt to access the RightHand and execute commands
                  let rightHandIdentifier = response.data.Result[0].RightHand['Identifier'] || response.data.Result[0].RightHand['prefabHash'];
                  connection.send(`wacky destroy ${rightHandIdentifier}`);
                  connection.send(`player set-stat "${owner}" hunger 99`);
                } catch (error) {
                  // Log "no Right Hand" if an error occurs
                 
                }
              }).catch(error => {
                
              });
            }
          }
        }
      } catch (error) {
        // Log any errors that occur in the main block
        
      }
      Commands();
    }).catch(error => {
      // Catch and log any errors from the connection.send promise
      
    });
  }, 2500);
    
  
  
  
function message(message,  player, time) {

  connection.send(`player message "${player}" "${message}" ${time}`);
}

function setplayerstat(player, stat, amount){
  connection.send(`player set-stat "${player}" ${stat} ${amount}`);
}

function modifyplayerstat(player, stat, amount, time, trues = true){
  connection.send(`player modify-stat "${player}" ${stat} ${amount} ${time} ${trues}`)
}

function sendMessageInParts(player, message) {
  // Split the message into words
  const words = message.split(' ');

  // Loop over the words in chunks of 20
  for (let i = 0; i < words.length; i += 20) {
    // Get a slice of 20 words or less
    const messagePart = words.slice(i, i + 20).join(' ');

    // Send each part with a 10-second interval between messages
    setTimeout(() => {
      connection.send(`player message ${player} "${messagePart}" 2`);
    }, i / 20 * 2000); // i / 20 calculates the interval in steps of 10 seconds
  }
}
function teleportplayer(player, playertwo) {
  connection.send(`player teleport "${player}" "${playertwo}"`);
}

function spawnitem(player, item, material = "", amount = 1) {
  // Construct the command based on the presence of optional parameters
  let command = `trade post ${player} ${item}`;

  // Add material and amount if they are provided
  if (material) command += ` ${material}`;
  if (amount) command += ` ${amount}`;

  // Send the constructed command
  connection.send(command);
}

connection.subscribe('PlayerJoined', (event) => {
  const player = event.data.user;
  const playerIndex = Object.keys(PlayerDic).length; // Use the next available index
  PlayerDic[playerIndex] = player.username.replace(' ', '').toLowerCase();
  console.log(`New player joined: ${player.username}`);
});

// Subscription to update PlayerDic when a player leaves
connection.subscribe('PlayerLeft', (event) => {
  const player = event.data.user;
  
  // Find the player in PlayerDic by username and remove them
  const playerEntry = Object.entries(PlayerDic).find(
    ([, username]) => username === player.username.replace(' ', '').toLowerCase()
  );
  
  if (playerEntry) {
    const [playerIndex] = playerEntry;
    delete PlayerDic[playerIndex];
    console.log(`Player left: ${player.username}`);
  }
});


const HEAD_THRESHOLD = 0.3; // Right hand near face
const ABOVE_HEAD_THRESHOLD = 0.3; // Left hand above head
const WHITELIST = ["scar012", "JL2345"]; // Add usernames of whitelisted players
const COOLDOWN_DURATION = 20000; // 20 seconds cooldown in milliseconds
const activeCooldowns = {}; // Track cooldowns for each player

function checkAndActivateRingOfFire() {
    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;
        
        if (!Array.isArray(players)) return;

        players.forEach(player => {
            // Check if player is whitelisted
            if (!WHITELIST.includes(player.username)) return;

            const headPosition = player.HeadPosition;
            const leftHandPosition = player.LeftHandPosition;
            const rightHandPosition = player.RightHandPosition;

            // Check if the player is on cooldown
            if (activeCooldowns[player.username]) return;

            // Check if right hand is near the face and left hand is above the head
            const rightHandToHeadDist = calculateDistance(rightHandPosition, headPosition);
            const leftHandAboveHead = leftHandPosition[1] > headPosition[1];
            
            if (rightHandToHeadDist <= HEAD_THRESHOLD && leftHandAboveHead) {
                
                connection.send(`player message "${player.username}" "You activated the Ring of Fire!"`);

                // Set the duration and interval for the Ring of Fire
                const ringDuration = 10000; // 10 seconds
                const damageInterval = 2000; // Every 2 seconds
                const casterPosition = player.Position;

                // Start the ring of fire for the triggering player
                const ringInterval = setInterval(() => {
                    connection.send('player list-detailed').then(resp => {
                        resp.data.Result.forEach(targetPlayer => {
                            const distance = calculateDistance(targetPlayer.Position, casterPosition);
                            if (distance <= 5 && targetPlayer.username !== player.username) { // Radius of 5 around caster
                                connection.send(`player damage "${targetPlayer.username}" 0.1`);
                                connection.send(`player message "${targetPlayer.username}" "You have been caught in the ring of fire!"`);
                               
                            }
                        });
                    });
                }, damageInterval);

                // Stop the ring of fire after the duration
                setTimeout(() => {
                    clearInterval(ringInterval);
                    
                }, ringDuration);

                // Set cooldown for the player
                activeCooldowns[player.username] = true;
                setTimeout(() => {
                    delete activeCooldowns[player.username];
                    
                }, COOLDOWN_DURATION);
            }
        });
    }).catch(console.error);
}

// Check for gesture and activate the ring every 3 seconds
setInterval(() => {
    checkAndActivateRingOfFire();
}, 3000);

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Configuration for "Nightmare" power
const NIGHTMARE_TOGETHER_THRESHOLD = 0.15; // Distance for detecting hands together
const NIGHTMARE_RADIUS = 5; // Radius in front of hands to check for players
const NIGHTMARE_EFFECT_DURATION = 10; // Duration of the nightmare effect in seconds
const NIGHTMARE_COOLDOWN_DURATION = 20000; // Cooldown duration (20 seconds)
const NIGHTMARE_WHITELIST = ["allowedplayer1", "allowedplayer2"]; // Whitelisted usernames for "Nightmare" power
const nightmareCooldowns = {}; // Track cooldowns for each player using "Nightmare"

function checkAndActivateNightmare() {
    

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;
        
        if (!Array.isArray(players)) {
            console.log("Error: Player data is not an array.");
            return;
        }

        players.forEach(player => {
            // Check if player is whitelisted
            if (!NIGHTMARE_WHITELIST.includes(player.username)) {
                
                return;
            }

            // Check if the player is on cooldown
            if (nightmareCooldowns[player.username]) {
                
                return;
            }

            const leftHandPosition = player.LeftHandPosition;
            const rightHandPosition = player.RightHandPosition;
            const handsTogetherDist = calculateDistance(leftHandPosition, rightHandPosition);

            // Check if hands are held together
            if (handsTogetherDist <= NIGHTMARE_TOGETHER_THRESHOLD) {
                
                connection.send(`player message "${player.username}" "Nightmare power activated. Checking targets in 3 seconds..."`);

                // Start cooldown for this player
                nightmareCooldowns[player.username] = true;
                setTimeout(() => {
                    delete nightmareCooldowns[player.username];
                    
                }, NIGHTMARE_COOLDOWN_DURATION);

                // Wait 3 seconds before checking for targets in front
                setTimeout(() => {
                    connection.send('player list-detailed').then(resp => {
                        const casterData = resp.data.Result.find(p => p.username === player.username);
                        if (!casterData) return;

                        const casterForward = casterData.HeadForward;
                        const casterPosition = casterData.Position;
                        const affectedPlayers = [];

                        resp.data.Result.forEach(targetPlayer => {
                            // Calculate if the target is within the radius in front of the hands
                            const distance = calculateDistance(targetPlayer.Position, casterPosition);
                            if (distance <= NIGHTMARE_RADIUS && targetPlayer.username !== player.username) { // Exclude caster
                                const vectorToTarget = [
                                    targetPlayer.Position[0] - casterPosition[0],
                                    targetPlayer.Position[1] - casterPosition[1],
                                    targetPlayer.Position[2] - casterPosition[2]
                                ];
                                const dotProduct = dot(vectorToTarget, casterForward);

                                // If the dot product is positive, target is in front
                                if (dotProduct > 0) {
                                    
                                    connection.send(`player modify-stat "${targetPlayer.username}" nightmare 1 ${NIGHTMARE_EFFECT_DURATION}`);
                                    connection.send(`player message "${targetPlayer.username}" "You have been inflicted with a nightmare!"`);
                                    affectedPlayers.push(targetPlayer.username);
                                }
                            }
                        });

                        // Inform the caster of who was affected
                        if (affectedPlayers.length > 0) {
                            const affectedList = affectedPlayers.join(', ');
                            connection.send(`player message "${player.username}" "Nightmare effect applied to: ${affectedList}"`);
                        } else {
                            connection.send(`player message "${player.username}" "No players were affected by the Nightmare effect."`);
                        }
                    });
                }, 3000);
            }
        });
    }).catch(console.error);
}

// Check for the gesture and activate the nightmare effect every 3 seconds
setInterval(() => {
    checkAndActivateNightmare();
}, 3000);

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Utility function to calculate dot product between two 3D vectors
function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}



const FIREBALL_DAMAGE = 0.3; // Damage percentage (e.g., 0.3 means 30% health)
const FIREBALL_RANGE = 5; // Range in which the fireball can hit players in front of the caster
const FIRE_CLASS_FILE = path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class1.json"); // Path to fire class JSON file
const BURN_DAMAGE = 0.05; // Burn damage per tick
const BURN_DURATION = 16000; // Total burn duration in milliseconds
const BURN_INTERVAL = 2000; // Burn tick interval in milliseconds
const BURN_CHANCE = 0.25; // 25% chance to apply burn effect
const COOLDOWN_TIME = 2000; // Cooldown time in milliseconds

const playerCooldowns = {}; // Store cooldown status for each player

function checkForFireballCast() {
    

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            
            return;
        }

        // Load the list of players in the fire class
        let fireClassPlayers = [];
        try {
            const data = fs.readFileSync(FIRE_CLASS_FILE, 'utf8');
            fireClassPlayers = JSON.parse(data);
            
            // Ensure fireClassPlayers is an array
            if (!Array.isArray(fireClassPlayers)) {
                fireClassPlayers = [];
            }
        } catch (error) {
            
        }

        players.forEach(player => {
            const username = player.username;

            // Check if the player is in the fire class
            if (!fireClassPlayers.includes(username)) {
                return; // Skip if the player is not in the fire class
            }

            // Check if the player is on cooldown
            if (playerCooldowns[username] && Date.now() - playerCooldowns[username] < COOLDOWN_TIME) {
                return; // Skip if the player is still on cooldown
            }

            const rightHandPosition = player.RightHandPosition;
            const headPosition = player.HeadPosition;
            const headForward = player.HeadForward;

            // Check if the right hand is close to the face to cast the fireball
            const isRightHandOnFace = calculateDistance(rightHandPosition, headPosition) <= 0.3;

            // If the right hand is on the face, cast the fireball
            if (isRightHandOnFace) {
                
                playerCooldowns[username] = Date.now(); // Start cooldown

                // Notify the player
                connection.send(`player message "${username}" "Shooting Fireball"`);

                // Find players in front of the caster within the fireball range
                players.forEach(target => {
                    if (target.username !== username) {
                        const targetPosition = target.Position;

                        // Check if the target is within the fireball range and in front of the caster
                        if (isInFront(headPosition, headForward, targetPosition) && calculateDistance(headPosition, targetPosition) <= FIREBALL_RANGE) {
                            // Apply initial fireball damage to the target
                            connection.send(`player damage ${target.username} ${FIREBALL_DAMAGE}`);
                            connection.send(`player message "${target.username}" "You were hit by a fireball cast by ${username}!"`);

                            // Apply burn effect with a 25% chance
                            if (Math.random() < BURN_CHANCE) {
                                applyBurnEffect(target.username);
                            }
                        }
                    }
                });
            }
        });
    }).catch(console.error);
}

// Function to apply the burn effect to a player
function applyBurnEffect(targetUsername) {
    

    let ticks = BURN_DURATION / BURN_INTERVAL; // Calculate total burn ticks

    // Apply burn damage at each interval
    const burnInterval = setInterval(() => {
        if (ticks <= 0) {
            clearInterval(burnInterval); // Stop the burn effect after duration
            
        } else {
            connection.send(`player damage ${targetUsername} ${BURN_DAMAGE}`);
            connection.send(`player message "${targetUsername}" "You are burning! Taking ${BURN_DAMAGE} damage."`);
            ticks--;
        }
    }, BURN_INTERVAL);
}

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Utility function to check if a target is in front of the caster based on head position and forward direction
function isInFront(casterPosition, casterForward, targetPosition) {
    const directionToTarget = [
        targetPosition[0] - casterPosition[0],
        targetPosition[1] - casterPosition[1],
        targetPosition[2] - casterPosition[2]
    ];
    const dotProduct = (directionToTarget[0] * casterForward[0]) +
                       (directionToTarget[1] * casterForward[1]) +
                       (directionToTarget[2] * casterForward[2]);
    return dotProduct > 0; // Positive dot product indicates the target is in front
}

// Set up a periodic check every 2 seconds for fireball casting conditions
setInterval(() => {
    checkForFireballCast();
}, 2000);


const repelAIR_CLASS_FILE = path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class4.json"); // Path to air class JSON file for Wind Slash
const WIND_SLASH_DAMAGE = 0.125; // Damage for Wind Slash
const WIND_SLASH_PUSH_DISTANCE = 5; // Distance to push players away
const WIND_SLASH_RANGE = 6; // Range in front of the right hand for Wind Slash
const WIND_SLASH_COOLDOWN = 4000; // Cooldown time in milliseconds (15 seconds)

const activeWindSlash = {}; // Store cooldown and active state for Wind Slash

// Function to check if a player has access to Wind Slash and activate it if eligible
function checkForWindSlashActivation() {
    console.log("Checking for Wind Slash activation for all players");

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            console.log("Error: Player data is not an array.");
            return;
        }

        // Load the list of players in the air class
        let airClassPlayers = [];
        try {
            const data = fs.readFileSync(repelAIR_CLASS_FILE, 'utf8');
            airClassPlayers = JSON.parse(data);
            
            // Ensure airClassPlayers is an array
            if (!Array.isArray(airClassPlayers)) {
                airClassPlayers = [];
            }
        } catch (error) {
            console.error(`Error reading air class file for Wind Slash: ${error}`);
        }

        players.forEach(player => {
            const username = player.username;

            // Check if the player is in the air class
            if (!airClassPlayers.includes(username)) {
                return; // Skip if the player is not in the air class
            }

            // Check if the player is on cooldown
            if (activeWindSlash[username]?.lastUsed && Date.now() - activeWindSlash[username].lastUsed < WIND_SLASH_COOLDOWN) {
                console.log(`Player ${username} is on cooldown for Wind Slash`);
                return; // Skip if the player is still on cooldown
            }

            const rightHandPosition = player.RightHandPosition;
            const headPosition = player.HeadPosition;
            const headForward = player.HeadForward;

            // Logging hand and head positions for troubleshooting
            console.log(`Checking Wind Slash for ${username}`);
            console.log(`Right Hand Y: ${rightHandPosition[1]}, Head Y: ${headPosition[1]}`);

            // Check if the right hand is above the head to activate Wind Slash
            const isRightHandAboveHead = rightHandPosition[1] > headPosition[1]; // No threshold, just any height above the head
            if (isRightHandAboveHead) {
                console.log(`${username} has raised their right hand above their head, activating Wind Slash`);
                activeWindSlash[username] = { active: true, lastUsed: Date.now() }; // Start cooldown and mark active

                // Notify the player that Wind Slash is charging
                connection.send(`player message "${username}" "Charging Wind Slash... Hold steady!"`);

                // Delay 3 seconds before executing the Wind Slash effect
                setTimeout(() => {
                    if (!activeWindSlash[username]?.active) return; // Confirm the ability is still active

                    // Notify the player that Wind Slash is about to be unleashed
                    connection.send(`player message "${username}" "Unleashing Wind Slash!"`);

                    // Find players in front of the right hand within range
                    players.forEach(target => {
                        if (target.username !== username) {
                            const targetPosition = target.Position;

                            // Check if the target is within the Wind Slash range and in front of the right hand
                            if (isInFront(rightHandPosition, headForward, targetPosition) && calculateDistance(rightHandPosition, targetPosition) <= WIND_SLASH_RANGE) {
                                // Apply Wind Slash damage to the target
                                connection.send(`player damage ${target.username} ${WIND_SLASH_DAMAGE}`);
                                connection.send(`player message "${target.username}" "You were hit by a Wind Slash from ${username}!"`);

                                // Calculate the new position for the push
                                const pushDirection = calculatePushDirection(rightHandPosition, targetPosition);
                                const newPosition = [
                                    targetPosition[0] + pushDirection[0] * WIND_SLASH_PUSH_DISTANCE,
                                    targetPosition[1],
                                    targetPosition[2] + pushDirection[2] * WIND_SLASH_PUSH_DISTANCE
                                ];

                                // Use the sequence to teleport the player to the new location
                                connection.send(`player set-home ${target.username} ${newPosition.join(",")}`);
                                connection.send(`player teleport ${target.username} home`);
                                connection.send(`player set-home ${target.username} 0,0,0`);
                            }
                        }
                    });

                    // Notify the player that the Wind Slash has been executed
                    connection.send(`player message "${username}" "Wind Slash executed successfully!"`);

                    // Reset the active state after execution
                    activeWindSlash[username].active = false;
                }, 3000); // 3-second delay
            } else {
                console.log(`${username}'s right hand is not above their head. Wind Slash not activated.`);
            }
        });
    }).catch(console.error);
}

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Utility function to calculate the push direction vector
function calculatePushDirection(origin, target) {
    const direction = [
        target[0] - origin[0],
        target[1] - origin[1],
        target[2] - origin[2]
    ];
    const magnitude = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
    return [direction[0] / magnitude, direction[1] / magnitude, direction[2] / magnitude];
}

// Utility function to check if a target is in front of the caster based on hand position and forward direction
function isInFront(handPosition, forwardDirection, targetPosition) {
    const directionToTarget = [
        targetPosition[0] - handPosition[0],
        targetPosition[1] - handPosition[1],
        targetPosition[2] - handPosition[2]
    ];
    const dotProduct = (directionToTarget[0] * forwardDirection[0]) +
                       (directionToTarget[1] * forwardDirection[1]) +
                       (directionToTarget[2] * forwardDirection[2]);
    return dotProduct > 0; // Positive dot product indicates the target is in front
}

// Set up a periodic check every 2 seconds for Wind Slash activation conditions
setInterval(() => {
    checkForWindSlashActivation();
}, 2000);

const FIRE_CLASS_FILE_FLAMETHROWER = path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class1.json"); // Path to fire class JSON file for flamethrower
const FLAMETHROWER_DAMAGE_PER_TICK = 0.005; // Damage per tick for flamethrower
const FLAMETHROWER_TICK_INTERVAL = 500; // Interval in milliseconds between each damage tick
const FLAMETHROWER_TOTAL_DURATION = 4000; // Total flamethrower duration in milliseconds (4 seconds)
const FLAMETHROWER_EFFECT_RANGE = 5; // Range in front of the right hand within which targets catch on fire
const FLAMETHROWER_BURN_CHANCE = 1.0; // 100% chance to apply burn effect in flamethrower
const FLAMETHROWER_COOLDOWN = 15000; // Cooldown time in milliseconds (15 seconds)

const activeFlamethrowers = {}; // Store active flamethrower state and cooldown for each player

function checkForFlamethrowerActivation() {
    

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            
            return;
        }

        // Load the list of players in the fire class
        let fireClassPlayersFlamethrower = [];
        try {
            const data = fs.readFileSync(FIRE_CLASS_FILE_FLAMETHROWER, 'utf8');
            fireClassPlayersFlamethrower = JSON.parse(data);
            
            // Ensure fireClassPlayersFlamethrower is an array
            if (!Array.isArray(fireClassPlayersFlamethrower)) {
                fireClassPlayersFlamethrower = [];
            }
        } catch (error) {
            
        }

        players.forEach(player => {
            const username = player.username;

            // Check if the player is in the fire class
            if (!fireClassPlayersFlamethrower.includes(username)) {
                return; // Skip if the player is not in the fire class
            }

            // Check if the player is on cooldown
            if (activeFlamethrowers[username]?.lastUsed && Date.now() - activeFlamethrowers[username].lastUsed < FLAMETHROWER_COOLDOWN) {
                return; // Skip if the player is still on cooldown
            }

            // Check if the player is already using the flamethrower
            if (activeFlamethrowers[username]?.active) {
                return; // Skip if the flamethrower is currently active
            }

            const leftHandPositionFlamethrower = player.LeftHandPosition;
            const rightHandPositionFlamethrower = player.RightHandPosition;
            const headPositionFlamethrower = player.HeadPosition;
            const headForwardFlamethrower = player.HeadForward;

            // Check if the left hand is close to the face to activate the flamethrower
            const isLeftHandOnFaceFlamethrower = calculateDistance(leftHandPositionFlamethrower, headPositionFlamethrower) <= 0.3;

            // If the left hand is on the face, activate the flamethrower
            if (isLeftHandOnFaceFlamethrower) {
                
                activeFlamethrowers[username] = { active: true, lastUsed: Date.now() }; // Mark the flamethrower as active and set cooldown

                // Notify the player
                connection.send(`player message "${username}" "Activating Flamethrower"`);

                // Start the flamethrower effect for 4 seconds
                const flamethrowerInterval = setInterval(() => {
                    // Find players in front of the right hand within range
                    players.forEach(target => {
                        if (target.username !== username) {
                            const targetPositionFlamethrower = target.Position;

                            // Check if the target is within the flamethrower range and in front of the right hand
                            if (isInFront(rightHandPositionFlamethrower, headForwardFlamethrower, targetPositionFlamethrower) && calculateDistance(rightHandPositionFlamethrower, targetPositionFlamethrower) <= FLAMETHROWER_EFFECT_RANGE) {
                                // Apply flamethrower damage to the target
                                connection.send(`player damage ${target.username} ${FLAMETHROWER_DAMAGE_PER_TICK}`);
                                connection.send(`player message "${target.username}" "You are caught in the flames!"`);

                                // Apply burn effect with a 100% chance
                                applyBurnEffectFlamethrower(target.username, FLAMETHROWER_DAMAGE_PER_TICK);
                            }
                        }
                    });
                }, FLAMETHROWER_TICK_INTERVAL);

                // Stop the flamethrower after 4 seconds
                setTimeout(() => {
                    clearInterval(flamethrowerInterval);
                   
                    connection.send(`player message "${username}" "Flamethrower deactivated"`);
                    activeFlamethrowers[username].active = false; // Reset flamethrower state
                }, FLAMETHROWER_TOTAL_DURATION);
            }
        });
    }).catch(console.error);
}

// Function to apply the burn effect to a player
function applyBurnEffectFlamethrower(targetUsername, burnDamage) {
    console.log(`Applying burn effect to ${targetUsername}`);

    let burnTicksFlamethrower = BURN_DURATION / BURN_INTERVAL; // Calculate total burn ticks

    // Apply burn damage at each interval
    const burnIntervalFlamethrower = setInterval(() => {
        if (burnTicksFlamethrower <= 0) {
            clearInterval(burnIntervalFlamethrower); // Stop the burn effect after duration
            console.log(`Burn effect ended for ${targetUsername}`);
        } else {
            connection.send(`player damage ${targetUsername} ${burnDamage}`);
            connection.send(`player message "${targetUsername}" "You are burning! Taking ${burnDamage} damage."`);
            burnTicksFlamethrower--;
        }
    }, BURN_INTERVAL);
}

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Utility function to check if a target is in front of the caster based on hand position and forward direction
function isInFront(handPosition, forwardDirection, targetPosition) {
  const directionToTargetFlamethrower = [
      targetPosition[0] - handPosition[0],
      targetPosition[1] - handPosition[1],
      targetPosition[2] - handPosition[2]
  ];
  const dotProductFlamethrower = (directionToTargetFlamethrower[0] * forwardDirection[0]) +
                                 (directionToTargetFlamethrower[1] * forwardDirection[1]) +
                                 (directionToTargetFlamethrower[2] * forwardDirection[2]);
  return dotProductFlamethrower > 0; // Positive dot product indicates the target is in front
}

// Set up a periodic check every 2 seconds for flamethrower activation conditions
setInterval(() => {
    checkForFlamethrowerActivation();
}, 2000);

// Configuration for "Slow" power
const SLOW_FACE_THRESHOLD = 0.2; // Distance for detecting hand near someone else's face
const SLOW_WHITELIST = ["JankBoteko", "Raiderr"]; // Add usernames of whitelisted players for "Slow"
const SLOW_EFFECT_DURATION = 10000; // Slow effect duration (5 seconds)
const SLOW_COOLDOWN_DURATION = 15000; // Cooldown duration (15 seconds) for "Slow" power
const slowCooldowns = {}; // Track cooldowns for each player using "Slow"

function checkAndActivateSlow() {
   

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            
            return;
        }

        players.forEach(player => {
            // Check if player is whitelisted
            if (!SLOW_WHITELIST.includes(player.username)) {
                
                return;
            }

            // Check if the player is on cooldown
            if (slowCooldowns[player.username]) {
                
                return;
            }

            const rightHandPosition = player.RightHandPosition;

            // Loop through all other players to check if the player's hand is near someone else's face
            players.forEach(targetPlayer => {
                // Skip if checking against the same player (self-check)
                if (targetPlayer.username === player.username) {
                    
                    return;
                }

                const targetHeadPosition = targetPlayer.HeadPosition;
                const handToFaceDistance = calculateDistance(rightHandPosition, targetHeadPosition);

                // If the right hand is near the other player's face, apply slow effect
                if (handToFaceDistance <= SLOW_FACE_THRESHOLD) {
                    console.log(`Slow effect activated by ${player.username} on ${targetPlayer.username}`);
                    connection.send(`player modify-stat "${targetPlayer.username}" speed -5 ${SLOW_EFFECT_DURATION / 1000}`);
                    connection.send(`player message "${targetPlayer.username}" "You have been slowed!"`);
                    connection.send(`player message "${player.username}" "You activated the slow effect on ${targetPlayer.username}!"`);

                    // Set cooldown for the player
                    slowCooldowns[player.username] = true;
                    
                    
                    // Remove cooldown after the set duration
                    setTimeout(() => {
                        delete slowCooldowns[player.username];
                        
                    }, SLOW_COOLDOWN_DURATION);
                } else {
                    
                }
            });
        });
    }).catch(error => {
        console.error("Error fetching player data:", error);
    });
}

// Check for the gesture and activate the slow effect every 3 seconds
setInterval(() => {
    checkAndActivateSlow();
}, 3000);


// Configuration for proximity check with multiple magic class positions and advantages
const INITIAL_BUTTON_POSITION = [-836.3657, 144.981659, 35.41477];
const MAGIC_CLASSES = [
    { 
        position: [-836.9289, 145.18103, 35.39332], 
        name: "Fire Magic", 
        advantages: "Increases attack power and adds burn effect to enemies.",
        filePath: path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class1.json")
    },
    { 
        position: [-836.563965, 145.3806, 35.3559227], 
        name: "Water Magic", 
        advantages: "Boosts healing abilities and enhances resistance to fire attacks.",
        filePath: path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class2.json")
    },
    { 
        position: [-836.109253, 145.396622, 35.2703857], 
        name: "Earth Magic", 
        advantages: "Increases defense and grants temporary invulnerability to physical attacks.",
        filePath: path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class3.json")
    },
    { 
        position: [-835.736145, 145.106812, 35.2247849], 
        name: "Air Magic", 
        advantages: "Enhances speed and agility, allowing quick dodges and increased jump height.",
        filePath: path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class4.json")
    }
];
const PROXIMITY_RADIUS = 0.1; // Fixed radius for all magic class positions
const GENERAL_PROXIMITY_RADIUS = 2; // General area around the buttons
const HANDS_TOGETHER_THRESHOLD = 0.1; // Distance to check if hands are held together

const playerActivationState = {}; // Track the selected class and confirmation state for each player

function checkMagicClassProximityForAllPlayers() {
    

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            console.log("Error: Player data is not an array.");
            return;
        }

        players.forEach(player => {
            const username = player.username;
            const leftHandPosition = player.LeftHandPosition;
            const rightHandPosition = player.RightHandPosition;

            // Initialize player state if not already set
            if (!playerActivationState[username]) {
                playerActivationState[username] = { selectedClass: null, awaitingConfirmation: false, hasClass: null, notified: false };
            }

            const playerState = playerActivationState[username];

            // Check if the player is within the general proximity area of the buttons
            const inGeneralProximity = MAGIC_CLASSES.some(magicClass => 
                calculateDistance(leftHandPosition, magicClass.position) <= GENERAL_PROXIMITY_RADIUS || 
                calculateDistance(rightHandPosition, magicClass.position) <= GENERAL_PROXIMITY_RADIUS
            );

            if (!inGeneralProximity) {
                playerState.notified = false; // Reset notification state when out of range
                return; // Skip further checks if the player is not within the general proximity
            }

            // Check if the player already has a class saved and store the result in player state
            if (playerState.hasClass === null) {
                playerState.hasClass = checkIfPlayerHasClass(username);
            }

            // If the player has a class and is in proximity, notify them only once
            if (playerState.hasClass) {
                if (!playerState.notified) {
                    connection.send(`player message "${username}" "You already have a magic class selected. You cannot choose a new one."`);
                    playerState.notified = true; // Mark that the player has been notified
                }
                return; // Exit further checks for this player
            }

            // Step 1: Allow player to view class advantages if within the general proximity
            MAGIC_CLASSES.forEach((magicClass) => {
                const targetPosition = magicClass.position;

                // Check proximity of left and right hands to each magic class position
                const isLeftHandClose = calculateDistance(leftHandPosition, targetPosition) <= PROXIMITY_RADIUS;
                const isRightHandClose = calculateDistance(rightHandPosition, targetPosition) <= PROXIMITY_RADIUS;

                // If either hand is close enough to a magic class position
                if (isLeftHandClose || isRightHandClose) {
                    console.log(`${username} is viewing ${magicClass.name}`);
                    connection.send(`player message "${username}" "You are viewing ${magicClass.name}. Advantages: ${magicClass.advantages}"`);
                    playerState.selectedClass = magicClass; // Set the selected class for potential saving
                }
            });

            // Step 2: Check if the player touches the initial button to initiate confirmation
            const isLeftHandOnInitialButton = calculateDistance(leftHandPosition, INITIAL_BUTTON_POSITION) <= PROXIMITY_RADIUS;
            const isRightHandOnInitialButton = calculateDistance(rightHandPosition, INITIAL_BUTTON_POSITION) <= PROXIMITY_RADIUS;

            if ((isLeftHandOnInitialButton || isRightHandOnInitialButton) && playerState.selectedClass && !playerState.awaitingConfirmation) {
                // Prompt player to hold hands together for final confirmation
                connection.send(`player message "${username}" "To confirm ${playerState.selectedClass.name}, hold your hands together."`);
                playerState.awaitingConfirmation = true;
                return;
            }

            // Step 3: Check if the player is holding their hands together to confirm selection
            if (playerState.awaitingConfirmation) {
                const handsTogetherDist = calculateDistance(leftHandPosition, rightHandPosition);

                if (handsTogetherDist <= HANDS_TOGETHER_THRESHOLD) {
                    // Save the selected class
                    savePlayerClass(username, playerState.selectedClass);
                    connection.send(`player message "${username}" "Your magic class ${playerState.selectedClass.name} has been set and saved!"`);
                    
                    // Reset player state after saving
                    playerState.selectedClass = null;
                    playerState.awaitingConfirmation = false;
                    playerState.hasClass = true; // Mark that the player now has a class
                    playerState.notified = true; // Set notification so they won't try to select again
                }
            }
        });
    }).catch(console.error);
}

// Function to check if a player already has a class saved
function checkIfPlayerHasClass(username) {
    return MAGIC_CLASSES.some(magicClass => {
        const filePath = magicClass.filePath;
        if (fs.existsSync(filePath)) {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const classData = JSON.parse(data);

                // Ensure classData is an array before using includes
                if (Array.isArray(classData)) {
                    return classData.includes(username);
                }
            } catch (error) {
                console.error(`Error reading or parsing file ${filePath}:`, error);
            }
        }
        return false;
    });
}

// Function to save the player's selected class to a JSON file
function savePlayerClass(username, magicClass) {
  const filePath = magicClass.filePath;

  fs.readFile(filePath, 'utf8', (err, data) => {
      let classData = [];
      if (!err && data) {
          try {
              classData = JSON.parse(data);
              // Ensure classData is an array
              if (!Array.isArray(classData)) {
                  classData = [];
              }
          } catch (error) {
              console.error(`Error parsing JSON from ${filePath}:`, error);
              classData = [];
          }
      }

      // Add the username to the class data if it's not already there
      if (!classData.includes(username)) {
          classData.push(username);
          fs.writeFile(filePath, JSON.stringify(classData, null, 2), err => {
              if (err) {
                  console.error(`Error saving class for ${username} to ${filePath}:`, err);
              } else {
                  console.log(`Saved ${username}'s class (${magicClass.name}) to ${filePath}`);
              }
          });
      }
  });
}
// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Set up a periodic check every 2 seconds for proximity to any magic class position for all players
setInterval(() => {
    checkMagicClassProximityForAllPlayers();
}, 2000);



const EARTH_CLASS_FILE = path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class3.json"); // Path to earth class JSON file for Pebble
const PEBBLE_DAMAGE = 0.25; // Damage dealt by Pebble
const PEBBLE_RANGE = 10; // Range within which the pebble can hit a target
const PEBBLE_COOLDOWN_DURATION = 6000; // Cooldown duration for Pebble in milliseconds (6 seconds)

const activePebbleUsers = {}; // Track users going through the Pebble activation steps
const pebbleCooldowns = {}; // Track cooldowns for each player using Pebble power

// Function to load earth class players from class3.json
function loadEarthClassPlayers() {
    try {
        const data = fs.readFileSync(EARTH_CLASS_FILE, 'utf8');
        const earthClassPlayers = JSON.parse(data);
        return Array.isArray(earthClassPlayers) ? earthClassPlayers : [];
    } catch (error) {
        console.error(`Error reading earth class file for Pebble: ${error}`);
        return [];
    }
}

// Function to check for Pebble power activation conditions and execute the power if eligible
function checkAndActivatePebble() {
    const earthClassPlayers = loadEarthClassPlayers(); // Load earth class players for Pebble power

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            return;
        }

        players.forEach(player => {
            const username = player.username;

            // Check if the player is in the earth class
            if (!earthClassPlayers.includes(username)) {
                return; // Skip if the player is not in the earth class
            }

            // Check if the player is on cooldown
            if (pebbleCooldowns[username]) {
                return; // Skip if the player is still on cooldown
            }

            const leftHandPosition = player.LeftHandPosition;
            const rightHandPosition = player.RightHandPosition;
            const headForward = player.HeadForward;
            const handsTogetherDist = calculateDistance(leftHandPosition, rightHandPosition);

            // Step 1: Detect hands together to start the Pebble power
            if (handsTogetherDist <= 0.2 && !activePebbleUsers[username]?.handsTogether) {
                activePebbleUsers[username] = { handsTogether: true };
                connection.send(`player message "${username}" "Step 1: Hands together detected for Pebble power. Aim with right hand to fire."`);
                return; // Wait for the next step
            }

            // Step 2: Detect aiming with the right hand and fire the pebble
            if (activePebbleUsers[username]?.handsTogether) {
                // Find the target in front of the right hand within range
                const target = findTargetInFront(players, rightHandPosition, headForward, PEBBLE_RANGE, username);
                if (target) {
                    connection.send(`player message "${username}" "Pebble fired!"`);
                    connection.send(`player message "${target.username}" "Hit by pebble!"`);
                    connection.send(`player damage ${target.username} ${PEBBLE_DAMAGE}`);

                    // Start cooldown for this player
                    pebbleCooldowns[username] = true;
                    setTimeout(() => {
                        delete pebbleCooldowns[username];
                        console.log(`Cooldown ended for ${username} on Pebble power.`);
                    }, PEBBLE_COOLDOWN_DURATION);

                    // Reset the activation state for the player
                    delete activePebbleUsers[username];
                }
            }
        });
    }).catch(console.error);
}

// Function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Function to find a target within range and in front of the right hand
function findTargetInFront(players, rightHandPosition, headForward, range, username) {
    let closestTarget = null;
    let closestDistance = range;

    players.forEach(target => {
        if (target.username !== username) {
            const targetPosition = target.Position;
            const distance = calculateDistance(rightHandPosition, targetPosition);

            if (distance <= range && isInFront(rightHandPosition, headForward, targetPosition)) {
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = target;
                }
            }
        }
    });

    return closestTarget;
}

// Utility function to check if a target is in front of the caster based on hand position and forward direction
function isInFront(handPosition, forwardDirection, targetPosition) {
    const directionToTarget = [
        targetPosition[0] - handPosition[0],
        targetPosition[1] - handPosition[1],
        targetPosition[2] - handPosition[2]
    ];
    const dotProduct = (directionToTarget[0] * forwardDirection[0]) +
                       (directionToTarget[1] * forwardDirection[1]) +
                       (directionToTarget[2] * forwardDirection[2]);
    return dotProduct > 0; // Positive dot product indicates the target is in front
}

// Set up a periodic check every 2 seconds for Pebble power activation conditions
setInterval(() => {
    checkAndActivatePebble();
}, 2000);


const AIR_CLASS_FILE = path.join("C:\\Users\\reape\\Documents\\GitHub\\Att-Starter\\class4.json"); // Air class JSON file for Repel Pulse
const REPEL_HANDS_TOGETHER_THRESHOLD = 0.15; // Distance to check if hands are together
const REPEL_HANDS_SEPARATED_THRESHOLD = 0.5; // Minimum distance for hands to be considered separated
const REPEL_RADIUS = 7; // Radius around caster for teleport effect
const REPEL_PUSH_DISTANCE = 10; // Distance to push players away from the caster
const REPEL_COOLDOWN_DURATION = 15000; // Cooldown duration (15 seconds)
const repelCooldowns = {}; // Track cooldowns for each player using "Repel Pulse"

// Variable to store initial hand height for gesture sequence
const lastGestureState = {};

// Function to load air class players from class4.json
function loadAirClassPlayers() {
    try {
        const data = fs.readFileSync(AIR_CLASS_FILE, 'utf8');
        const airClassPlayers = JSON.parse(data);
        return Array.isArray(airClassPlayers) ? airClassPlayers : [];
    } catch (error) {
        console.error(`Error reading air class file for Repel Pulse: ${error}`);
        return [];
    }
}

// Function to check and activate Repel Pulse if conditions are met
function checkAndActivateRepelPulse() {
    const airClassPlayers = loadAirClassPlayers(); // Load air class players for Repel Pulse

    connection.send('player list-detailed').then(response => {
        const players = response?.data?.Result;

        if (!Array.isArray(players)) {
            return;
        }

        players.forEach(player => {
            // Check if the player is in the air class
            if (!airClassPlayers.includes(player.username)) {
                return; // Skip if the player is not in the air class
            }

            // Check if the player is on cooldown
            if (repelCooldowns[player.username]) {
                return; // Skip if the player is still on cooldown
            }

            const leftHandPosition = player.LeftHandPosition;
            const rightHandPosition = player.RightHandPosition;
            const handsTogetherDist = calculateDistance(leftHandPosition, rightHandPosition);

            // Step 1: Detect hands together
            if (handsTogetherDist <= REPEL_HANDS_TOGETHER_THRESHOLD && !lastGestureState[player.username]?.handsTogether) {
                // Mark the hands together gesture
                lastGestureState[player.username] = {
                    handsTogether: true,
                    initialHandHeight: Math.min(leftHandPosition[1], rightHandPosition[1])
                };
                connection.send(`player message "${player.username}" "Step 1: Hands together detected."`);
                return; // Wait for the next step
            }

            // Step 2: Detect hands separated below initial height
            if (lastGestureState[player.username]?.handsTogether) {
                const initialHeight = lastGestureState[player.username].initialHandHeight;
                const currentHandHeight = Math.min(leftHandPosition[1], rightHandPosition[1]);

                if (handsTogetherDist >= REPEL_HANDS_SEPARATED_THRESHOLD && currentHandHeight < initialHeight) {
                    connection.send(`player message "${player.username}" "Repel Pulse activated! Pushing away nearby players."`);

                    // Start cooldown for this player
                    repelCooldowns[player.username] = true;
                    setTimeout(() => {
                        delete repelCooldowns[player.username];
                        console.log(`Cooldown ended for ${player.username} on Repel Pulse effect.`);
                    }, REPEL_COOLDOWN_DURATION);

                    // Reset gesture state for the player
                    delete lastGestureState[player.username];

                    // Teleport nearby players away from the caster
                    connection.send('player list-detailed').then(resp => {
                        const casterData = resp.data.Result.find(p => p.username === player.username);
                        if (!casterData) return;

                        const casterPosition = casterData.Position;
                        const affectedPlayers = [];

                        resp.data.Result.forEach(targetPlayer => {
                            const distance = calculateDistance(targetPlayer.Position, casterPosition);
                            if (distance <= REPEL_RADIUS && targetPlayer.username !== player.username) {
                                // Calculate the new position by pushing the target away from the caster
                                const vectorToTarget = [
                                    targetPlayer.Position[0] - casterPosition[0],
                                    targetPlayer.Position[1] - casterPosition[1],
                                    targetPlayer.Position[2] - casterPosition[2]
                                ];
                                const magnitude = Math.sqrt(vectorToTarget[0]**2 + vectorToTarget[1]**2 + vectorToTarget[2]**2);
                                const pushDirection = [
                                    vectorToTarget[0] / magnitude,
                                    vectorToTarget[1] / magnitude,
                                    vectorToTarget[2] / magnitude
                                ];
                                const newPosition = [
                                    casterPosition[0] + pushDirection[0] * REPEL_PUSH_DISTANCE,
                                    casterPosition[1] + pushDirection[1] * REPEL_PUSH_DISTANCE,
                                    casterPosition[2] + pushDirection[2] * REPEL_PUSH_DISTANCE
                                ];

                                // Use teleport sequence to move the player
                                teleportPlayerToPosition(targetPlayer.username, newPosition);
                                affectedPlayers.push(targetPlayer.username);
                            }
                        });

                        // Inform the caster of who was affected
                        if (affectedPlayers.length > 0) {
                            const affectedList = affectedPlayers.join(', ');
                            connection.send(`player message "${player.username}" "Repel Pulse applied to: ${affectedList}"`);
                        } else {
                            connection.send(`player message "${player.username}" "No players were affected by Repel Pulse."`);
                        }
                    });
                }
            }
        });
    }).catch(console.error);
}

// Function to teleport a player to a specified position using the teleport sequence
function teleportPlayerToPosition(username, position) {
    const cords = `${position[0]},${position[1]},${position[2]}`;
    console.log(`Teleporting ${username} to position: ${cords}`);
    connection.send(`player set-home ${username} ${cords}`);
    connection.send(`player teleport ${username} home`);
    connection.send(`player set-home ${username} 0,0,0`);
    console.log(`Teleport sequence complete for ${username}.`);
}

// Function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}

// Check for the gesture and activate the Repel Pulse effect every 3 seconds
setInterval(() => {
    checkAndActivateRepelPulse();
}, 3000);

// Utility function to calculate distance between two 3D points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2[0] - point1[0], 2) +
        Math.pow(point2[1] - point1[1], 2) +
        Math.pow(point2[2] - point1[2], 2)
    );
}


async function Commands() {

  rl.question('Enter Command: ', async (Command) => {
    if (Command === 'scan target') {
      connection.send('player list-detailed').then(resp => {
          const players = resp.data.Result;
          
          for (const player of players) {
              const leftHand = player.LeftHandPosition;
              const rightHand = player.RightHandPosition;
              
              for (const otherPlayer of players) {
                  const headPosition = otherPlayer.HeadPosition;
                  const distanceLeftHand = utility.calculateDistance(leftHand, headPosition);
                  const distanceRightHand = utility.calculateDistance(rightHand, headPosition);
                  
                  if ((distanceLeftHand <= 0.2 || distanceRightHand <= 0.2) && player.username === owner) {
                      const targetUsername = otherPlayer.username.replace(' ', '').toLowerCase();
                      connection.send(`player message ${owner} "${otherPlayer.username} is targeted" 5`);
                      target = targetUsername;
                  }
              }
          }
          Commands();
      });
  } else if (Command === 'fast_tornado') {
    const tornadoRadius = 20; // Radius around the owner where players will be affected
    const maxLiftHeight = 15; // Maximum height players are lifted
    const spinDuration = 5000; // Duration of the tornado in milliseconds
    const spinSpeed = 1.0; // Speed of the spin (increased for fast effect)
    const intervalDelay = 100; // Faster delay for rapid teleportation
  
    let angle = 0; // Starting angle for circular motion
    let activePlayers = []; // Array to store players in the tornado
  
    connection.send('player list-detailed').then(resp => {
      const ownerData = resp.data.Result.find(p => p.username === owner);
      if (!ownerData) {
        console.log('Owner not found');
        return;
      }
  
      const ownerPosition = ownerData.Position;
  
      // Identify players within the tornado radius
      activePlayers = resp.data.Result.filter(player => {
        const distance = utility.calculateDistance(player.Position, ownerPosition);
        return distance <= tornadoRadius && player.username !== owner;
      });
  
      // Function to teleport players in a rapid circular, lifting motion
      function spinPlayers() {
        activePlayers.forEach(player => {
          const x = ownerPosition[0] + tornadoRadius * Math.cos(angle);
          const z = ownerPosition[2] + tornadoRadius * Math.sin(angle);
          const y = ownerPosition[1] + Math.min(maxLiftHeight, angle / (2 * Math.PI)) * maxLiftHeight; // Rapid lift up to max height
  
          connection.send(`player set-home "${player.username}" ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`);
          connection.send(`player teleport "${player.username}" home`);
          connection.send(`player message "${player.username}" "You are caught in a high-speed tornado!" 5`);
        });
  
        angle += spinSpeed;
  
        // Stop spinning after the tornado duration
        if (Date.now() - startTime >= spinDuration) {
          clearInterval(tornadoInterval);
          // Drop players back to the ground after tornado ends
          activePlayers.forEach(player => {
            connection.send(`player set-home "${player.username}" ${ownerPosition[0]},${ownerPosition[1]},${ownerPosition[2]}`);
            connection.send(`player teleport "${player.username}" home`);
            connection.send(`player message "${player.username}" "The tornado has released you!" 5`);
          });
        }
      }
  
      const startTime = Date.now();
      const tornadoInterval = setInterval(spinPlayers, intervalDelay);
    }).catch(console.error);
  
    Commands();
  } else if (Command === 'follow') {
    // Start following the target player
    followInterval = setInterval(() => {
      connection.send(`player list-detailed`).then(resp => {
        const ownerData = resp.data.Result.find(p => p.username === owner);
        if (!ownerData) {
          console.log('Owner not found');
          clearInterval(followInterval);
          return;
        }
  
        const ownerPosition = ownerData.Position;
        const targetPlayer = resp.data.Result.find(p => p.username === target);
  
        if (targetPlayer) {
          const targetPosition = `${ownerPosition[0]},${ownerPosition[1]},${ownerPosition[2]}`;
          connection.send(`player set-home "${target}" ${targetPosition}`);
          connection.send(`player teleport "${target}" home`);
          connection.send(`player message "${target}" "You are now following ${owner}."`);
          connection.send(`player modify-stat "${target}" speed 0.5 1 true`)
        } else {
          console.log(`${target} not found`);
          clearInterval(followInterval);
        }
      });
    }, 500); // Adjust interval as needed for smoother following
  
    console.log(`${target} is now following ${owner}. Type "stop" to end.`);
  thing();

    function thing() {
    rl.question('Type "remove chain" to end follow: ', (stopCommand) => {
      if (stopCommand.toLowerCase() === 'remove chain') {
        clearInterval(followInterval);
        console.log(`Stopped following ${target}.`);
        connection.send(`player message "${target}" "You are no longer following ${owner}."`);
      }
      else {
        thing();
      }
      
    });
  }
  
  } else if (Command === 'onduty') {
      modifyplayerstat(owner, 'damage', 15, 99999999, false);
      modifyplayerstat(owner, 'damageprotection', 999999,  99999999, false);
      modifyplayerstat(owner, 'speed', 5, 99999999, false);
      modifyplayerstat(owner, 'aggro', -5,  99999999, false);
      message('your gardian angel has blessed you', owner, 5);

    } else if (Command === 'test') {
     
    } else if (Command === 'detect') {
      connection.send(`player list-detailed`).then(resp => {
        if (!resp.data || !resp.data.Result) {
            console.error('Response data or Result is undefined:', resp);
            return;
        }
    
        for (let i = 0; i < resp.data.Result.length; i++) {
            if (resp.data.Result[i].username === owner) {
                for (let k = 0; k < resp.data.Result.length; k++) {
                    var playerPosition = resp.data.Result[k].Position;
                    var ownerPosition = resp.data.Result[i].Position;
                    var area = utility.calculateDistance(playerPosition, ownerPosition);
                    console.log(area);
                    if (area < 20.0 && resp.data.Result[k].username != owner) {
                        phantomList.push(resp.data.Result[k].username);
                    }
                }
            }
        }
    
        var message = '';
        for (var i = 0; i < phantomList.length; i++) {
            connection.send(`player message ${phantomList[i]} "~~You've been discovered~~" 5`);
            message += phantomList[i] + '\n';
        }
        connection.send(`player message ${owner} "${message}" 5`);
        phantomList = [];
        Commands();
    }).catch(error => {
        console.error('Failed to send command:', error);
    });
    
    } else // Target command handler
   if (Command === 'push_back_nearby') {
    const pushDistance = 10; // Distance to push players back
    const detectRadius = 20; // Detection radius around the owner

    connection.send('player list-detailed').then(resp => {
        const ownerData = resp.data.Result.find(p => p.username === owner);
        if (!ownerData) {
            console.log('Owner data not found.');
            return Commands();
        }

        const ownerPosition = ownerData.Position;
        resp.data.Result.forEach(player => {
            if (player.username === owner) return; // Skip the owner

            const playerPosition = player.Position;
            const distance = utility.calculateDistance(playerPosition, ownerPosition);

            // If the player is within the detection radius, push them back
            if (distance <= detectRadius) {
                // Calculate the direction vector from the owner to the player
                const directionX = playerPosition[0] - ownerPosition[0];
                const directionZ = playerPosition[2] - ownerPosition[2];
                const magnitude = Math.sqrt(directionX ** 2 + directionZ ** 2);

                // Normalize the direction and multiply by push distance
                const pushX = ownerPosition[0] + (directionX / magnitude) * (distance + pushDistance);
                const pushZ = ownerPosition[2] + (directionZ / magnitude) * (distance + pushDistance);
                const pushPosition = `${pushX.toFixed(3)},${playerPosition[1]},${pushZ.toFixed(3)}`; // Retain original Y position

                // Set the player's new position, teleport, and reset home
                connection.send(`player set-home "${player.username}" ${pushPosition}`);
                connection.send(`player teleport "${player.username}" home`);
                connection.send(`player set-home "${player.username}" 0,0,0`);
                connection.send(`player message "${player.username}" "You have been pushed back from ${owner}!" 5`);
                console.log(`Pushed ${player.username} back to position [${pushPosition}]`);
            }
        });

        Commands();
    });
  } else if (Command === 'push_back_continuous') {
    const pushRadius = 10; // Radius around the owner for pushing players back
    const pushDistance = 5; // Distance to push players back each time
    const intervalDelay = 200; // Delay between each push-back check
  
    let isPushing = true; // Flag to control when to stop the push-back loop
  
    function pushPlayersBack() {
      if (!isPushing) return; // Stop if the command is turned off
  
      connection.send('player list-detailed').then(resp => {
        const ownerData = resp.data.Result.find(p => p.username === owner);
        if (!ownerData) {
          console.log('Owner not found');
          return;
        }
  
        const ownerPosition = ownerData.Position;
  
        resp.data.Result.forEach(player => {
          if (player.username !== owner) {
            const distance = utility.calculateDistance(player.Position, ownerPosition);
  
            // If the player is within the push radius, push them back
            if (distance <= pushRadius) {
              const directionX = player.Position[0] - ownerPosition[0];
              const directionZ = player.Position[2] - ownerPosition[2];
              const magnitude = Math.sqrt(directionX ** 2 + directionZ ** 2);
  
              // Calculate new position by pushing back
              const pushX = ownerPosition[0] + (directionX / magnitude) * (distance + pushDistance);
              const pushZ = ownerPosition[2] + (directionZ / magnitude) * (distance + pushDistance);
  
              // Set player's new position and teleport them
              connection.send(`player set-home "${player.username}" ${pushX.toFixed(3)},${player.Position[1]},${pushZ.toFixed(3)}`);
              connection.send(`player teleport "${player.username}" home`);
              connection.send(`player message "${player.username}" "You are being pushed back by ${owner}!" 5`);
            }
          }
        });
      }).catch(console.error);
  
      // Continue pushing back at intervals
      setTimeout(pushPlayersBack, intervalDelay);
    }
  
    // Start the continuous push-back
    pushPlayersBack();
  
    // Wait for a command to stop the push-back
    rl.question('Type "stop" to end push-back: ', answer => {
      if (answer.toLowerCase() === 'stop') {
        isPushing = false; // Set flag to stop the loop
        connection.send(`player message "${owner}" "Push-back mode deactivated." 5`);
      }
      Commands();
    });
  } else if (Command === 'push_back_nearby') {
    const pushDistance = 10; // Distance to push players back
    const detectRadius = 20; // Detection radius around the owner

    connection.send('player list-detailed').then(resp => {
        const ownerData = resp.data.Result.find(p => p.username === owner);
        if (!ownerData) {
            console.log('Owner data not found.');
            return Commands();
        }

        const ownerPosition = ownerData.Position;
        resp.data.Result.forEach(player => {
            if (player.username === owner) return; // Skip the owner

            const playerPosition = player.Position;
            const distance = utility.calculateDistance(playerPosition, ownerPosition);

            // If the player is within the detection radius, push them back
            if (distance <= detectRadius) {
                // Calculate the direction vector from the owner to the player
                const directionX = playerPosition[0] - ownerPosition[0];
                const directionZ = playerPosition[2] - ownerPosition[2];
                const magnitude = Math.sqrt(directionX ** 2 + directionZ ** 2);

                // Normalize the direction and multiply by push distance
                const pushX = ownerPosition[0] + (directionX / magnitude) * (distance + pushDistance);
                const pushZ = ownerPosition[2] + (directionZ / magnitude) * (distance + pushDistance);
                const pushPosition = [pushX.toFixed(3), playerPosition[1], pushZ.toFixed(3)]; // Retain original Y position

                // Set the player's new position
                connection.send(`player set-home "${player.username}" ${pushPosition.join(',')}`);
                connection.send(`player teleport "${player.username}" home`);
                connection.send(`player message "${player.username}" "You have been pushed back from ${owner}!" 5`);
                console.log(`Pushed ${player.username} back to position [${pushPosition.join(',')}]`);
            }
        });

        Commands();
    })
  }
 else if (Command === 'target') {
      // Refresh PlayerDic to include any new players
      refreshPlayerDic();
    
      // Create a formatted message with player numbers and names
      const message = Object.entries(PlayerDic)
        .map(([num, player]) => `${num}: ${player}`)
        .join('\n');
    
      // Send the player list message
      connection.send(`player message ${owner} "${message}\n all\n self" 5`);
      console.log(`${owner} ${message}`);
    
      // Prompt the user for a player selection
      rl.question('Enter player num: ', (command1) => {
        switch (command1) {
          case 'all':
            connection.send(`player message ${owner} "All Players Are Now Targeted" 5`);
            target = '*';
            connection.send(`player modify-stat ${target} lumonsity 3000 5 true`);
            break;
          case 'self':
            target = owner;
            connection.send(`player modify-stat ${target} lumonsity 3000 5 true`);
            break;
          default:
            target = PlayerDic[command1];
            connection.send(`player message ${owner} "${target}" 7`);
            connection.send(`player modify-stat ${target} lumonsity 3000 5 true`);
            console.log('Message sent');
            break;
        }
    
        // Call the Commands function again to continue
        Commands();
      });
    }
     else if (Command === 'spawn') {
      rl.question('spawn item: ', (item) => {
        if (item === 'chicken'){
          connection.send(`trade post ${target}`);
        }
      })
     } else if (Command === 'push_back_continuous') {
      const pushRadius = 10; // Radius around the owner for pushing players back
      const pushDistance = 5; // Distance to push players back each time
      const intervalDelay = 200; // Delay between each push-back check
    
      let isPushing = true; // Flag to control when to stop the push-back loop
    
      function pushPlayersBack() {
        if (!isPushing) return; // Stop if the command is turned off
    
        connection.send('player list-detailed').then(resp => {
          const ownerData = resp.data.Result.find(p => p.username === owner);
          if (!ownerData) {
            console.log('Owner not found');
            return;
          }
    
          const ownerPosition = ownerData.Position;
    
          resp.data.Result.forEach(player => {
            if (player.username !== owner) {
              const distance = utility.calculateDistance(player.Position, ownerPosition);
    
              // If the player is within the push radius, push them back
              if (distance <= pushRadius) {
                const directionX = player.Position[0] - ownerPosition[0];
                const directionZ = player.Position[2] - ownerPosition[2];
                const magnitude = Math.sqrt(directionX ** 2 + directionZ ** 2);
    
                // Calculate new position by pushing back
                const pushX = ownerPosition[0] + (directionX / magnitude) * (distance + pushDistance);
                const pushZ = ownerPosition[2] + (directionZ / magnitude) * (distance + pushDistance);
    
                // Set player's new position and teleport them
                connection.send(`player set-home "${player.username}" ${pushX.toFixed(3)},${player.Position[1]},${pushZ.toFixed(3)}`);
                connection.send(`player teleport "${player.username}" home`);
                connection.send(`player message "${player.username}" "You are being pushed back by ${owner}!" 5`);
              }
            }
          });
        }).catch(console.error);
    
        // Continue pushing back at intervals
        setTimeout(pushPlayersBack, intervalDelay);
      }
    
      // Start the continuous push-back
      pushPlayersBack();
    
      // Wait for a command to stop the push-back
      rl.question('Type "stop" to end push-back: ', answer => {
        if (answer.toLowerCase() === 'stop') {
          isPushing = false; // Set flag to stop the loop
          connection.send(`player message "${owner}" "Push-back mode deactivated." 5`);
        }
        Commands();
      });
    } else if (Command === 'meteor_strike') {
     
        connection.send(`player detailed ${target}`).then(resp => {
          if (resp.data && resp.data.Result) {
            const playerPosition = resp.data.Result.Position;
    
            // Damage target
            connection.send(`player damage "${target}" 1.0`);
            connection.send(`player message "${target}" "A meteor has struck you!" 5`);
    
            // Shockwave effect
            connection.send('player list-detailed').then(allPlayers => {
              allPlayers.data.Result.forEach(player => {
                const distance = utility.calculateDistance(player.Position, playerPosition);
                if (distance <= 10 && player.username !== target) {
                  const pushX = player.Position[0] + (player.Position[0] - playerPosition[0]);
                  const pushZ = player.Position[2] + (player.Position[2] - playerPosition[2]);
                  connection.send(`player set-home "${player.username}" ${pushX.toFixed(3)},${player.Position[1]},${pushZ.toFixed(3)}`);
                  connection.send(`player teleport "${player.username}" home`);
                  connection.send(`player message "${player.username}" "You are blasted by the meteor shockwave!" 5`);
                  connection.send(`player damage ${player.username} 0.5`);
                }
              });
            }).catch(console.error);
          
            Commands();
        
      
          }
        });
      } else if (Command === 'hurricane_zone') {
      const pushDistance = 10;
      const rotationSpeed = 0.1; // Adjust rotation speed
      let angle = 0;
    
      function createHurricane() {
        connection.send('player list-detailed').then(resp => {
          const ownerData = resp.data.Result.find(p => p.username === owner);
          if (!ownerData) return;
    
          const ownerPosition = ownerData.Position;
          resp.data.Result.forEach(player => {
            if (player.username !== owner) {
              const distance = utility.calculateDistance(player.Position, ownerPosition);
              if (distance <= 20) { // Hurricane radius
                const offsetX = pushDistance * Math.cos(angle);
                const offsetZ = pushDistance * Math.sin(angle);
                const newX = ownerPosition[0] + offsetX;
                const newZ = ownerPosition[2] + offsetZ;
    
                connection.send(`player set-home "${player.username}" ${newX.toFixed(3)},${player.Position[1]},${newZ.toFixed(3)}`);
                connection.send(`player teleport "${player.username}" home`);
                connection.send(`player message "${player.username}" "You are caught in a hurricane!" 5`);
              }
            }
          });
          angle += rotationSpeed;
        }).catch(console.error);
      }
    
      const hurricaneInterval = setInterval(createHurricane, 500);
      setTimeout(() => clearInterval(hurricaneInterval), 10000); // Hurricane lasts 10 seconds
      Commands();
    } else if (Command === 'random_teleport') {
      
        const locations = [
          "OriginalSpawnPoint", "OutsideCave", "OutsideTower", "TowerCP1", 
          "TowerCP2", "TowerCP3", "OutsideLake", "MountainPass", "HolidayZone"
        ];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        connection.send(`player teleport "${target}" ${randomLocation}`);
        connection.send(`player message "${target}" "You have been teleported to a random location: ${randomLocation}"`);
    
      Commands();
    } else if (Command === 'spirit form') {
      connection.send('player list-detailed').then(async resp => {
        for (let w = 0; w < resp.data.Result.length; w++) {
          for (let l = 0; l < resp.data.Result.length; l++) {
            var head = resp.data.Result[l].HeadPosition;
            var lefthand = resp.data.Result[w].LeftHandPosition;
            var righthand = resp.data.Result[w].RightHandPosition;
    
            // Calculating distances
            var abovehead = lefthand[1] - head[1]; // Check if Y component difference is significant
            var handstogether = utility.calculateDistance(lefthand, righthand);
            var onface = utility.calculateDistance(righthand, head);
    
            // Check if the LeftHandPosition's Y component is sufficiently above HeadPosition's Y component
            if (handstogether <= 0.3 && resp.data.Result[w].username === owner) {
              connection.send(`player teleport "${target}" towerend`);
              
              connection.send(`player kill "${target}"`);
            
              
              connection.send(`wacky destroy-free playergrave`);
              
              connection.send(`player teleport "${target}" ${owner}`);
              Commands();
            }
          }
        }
      });
    } else if (Command === 'Go') {
      connection.send(`player teleport ${owner} "${target}"`);
      Commands();
    } else if (Command === 'slow') {
      connection.send(`player cripple "${target}"`);
      Commands();
    } else if (Command === 'damage') {
      connection.send(`player modify-stat "${target}" damage 999999999 9999999999 true`);
      Commands();
    } else if (Command === 'god') {
      connection.send(`player god-mode ${owner} true`);
      Commands();
    } else if (Command === 'current target') {
      connection.send(`player message ${owner} "Target Is "${target}"" 4`);
      Commands();
    } else if (Command === 'shadow realm') {
      connection.send(`microtutorial start "${target}" 62180`);
      connection.send(`player message "${target}" "you Have Been Banished To The Shadow Realm" 5`);
      Commands();
    } else if (Command === 'lightning') {
      connection.send(`player damage ${target} 0.50`);
      connection.send(`player message ${target} "You have been struck by lightning" 10`);
      Commands();
    } else if (Command === 'summon') {
      connection.send(`player teleport "${target}" ${owner}`);
      Commands();
    } else if (Command === 'connect') {
      // Map players to a dictionary with their index as the key and formatted username as the value
      const PlayerDic = connection.server.players.reduce((acc, player, index) => {
        acc[index] = player.username.replace(' ', '').toLowerCase();
        return acc;
      }, {});
    
      // Create a formatted message with player numbers and names
      const message = Object.entries(PlayerDic)
        .map(([num, player]) => `${num}: ${player}`)
        .join('\n');
    
      // Send the player list message to the owner
      connection.send(`player message ${owner} "${message}\nSelect two players to teleport." 35`);
    
      // Prompt the user for the first player selection
      rl.question('Enter player number 1: ', (playerOneIndex) => {
        const playerOne = connection.server.players[playerOneIndex]?.username;
    
        if (!playerOne) {
          connection.send(`player message ${owner} "Invalid player number for player one." 5`);
          return Commands();
        }
    
        // Prompt the user for the second player selection
        rl.question('Enter player number 2: ', (playerTwoIndex) => {
          const playerTwo = connection.server.players[playerTwoIndex]?.username;
    
          if (!playerTwo) {
            connection.send(`player message ${owner} "Invalid player number for player two." 5`);
            return Commands();
          }
    
          // Execute the playerteleport command
          teleportplayer(playerOne, playerTwo)
          connection.send(`player message ${owner} "Teleported ${playerOne} to ${playerTwo}." 5`);
          console.log(`Teleported ${playerOne} to ${playerTwo}`);
    
          // Clear the indices after teleportation
          playerOneIndex = null;
          playerTwoIndex = null;
    
          // Call the Commands function again to continue
          Commands();
        });
      });
    } else if (Command === 'fling') {
      connection.send(`player list-detailed`).then(resp => {
        for (let i = 0; i < resp.data.Result.length; i++) {
            for (let k = 0; k < resp.data.Result.length; k++) {
                var head2 = resp.data.Result[k].HeadPosition
                var lefthand1 = resp.data.Result[i].LeftHandPosition
                var righthand1 = resp.data.Result[i].RightHandPosition

                var dis = utility.calculateDistance(lefthand1, head2)
                var dis2 = utility.calculateDistance(righthand1, head2)

                if (dis <= 0.2 || dis2 <= 0.2 && resp.data.Result[i].username == owner) {
                   connection.send(`player fling "${target}" 700`)
                }
            }
        }

        
        
    })
    } else if (Command === 'players') {
      connection.send('player list').then(playerss => {
        for  (let i = 0; i < playerss.data.Result.length; i++) {
          var people = playerss.data.Result[i]
        }

      })

     

    } else if (Command === 'replaceleft') {
      connection.send(`player inventory ${owner}`).then(response => {
          
        connection.send(`wacky replace ${response.data.Result[0].LeftHand['Identifier'] || response.data.Result[0].LeftHand['prefabHash']}`)

      })
      Commands()
  } else if (Command === 'replaceright') {
    connection.send(`player inventory ${owner}`).then(response => {
        
      connection.send(`wacky replace ${response.data.Result[0].RightHand['Identifier'] || response.data.Result[0].RightHand['prefabHash']}`)

    })
    Commands()
} else if (Command === 'destroy') {
  
} else if (Command === 'getback'){
// Constants for circular movement
const radius = 5; // Radius of the circle
const angleIncrement = 0.1; // Smaller angle increment for more steps in the circle
let angle = 0; // Start angle in radians
let circlesCompleted = 0; // Counter for completed circles
const delay = 50; // Shorter delay between each step in milliseconds

// Flag to indicate if the movement should continue
let isMoving = true;

// Function to move the player in circular steps
function movePlayerInCircle(target) {
  if (!target) {
    console.log('Error: Target player is not specified. Please provide a valid player username or ID.');
    return;
  }

  if (!isMoving) {
    console.log('Movement stopped.');
    return;
  }

  console.log(`Attempting to get position for player: ${target}`);

  connection.send(`player detailed ${target}`)
    .then(pos => {
      console.log('Received response:', pos);

      // Check if the position data is valid
      if (pos.data && pos.data.Result && pos.data.Result.Position && Array.isArray(pos.data.Result.Position)) {
        const positions = pos.data.Result.Position;

        // Log the original position
        console.log(`Original Position: [${positions.join(',')}]`);

        // Calculate the new position based on the current angle
        const x = positions[0] + radius * Math.cos(angle);
        const z = positions[2] + radius * Math.sin(angle);
        const y = positions[1]; // Keep the same Y level

        // Update the position for teleportation
        const updatedPosition = [x, y, z];

        // Log the updated position
        console.log(`Updated Position: [${updatedPosition.join(',')}]`);

        // Send the updated position as a set-home command
        connection.send(`player set-home ${target} ${updatedPosition.join(',')}`);

        // Teleport the player to their home
        connection.send(`player teleport ${target} home`);

        // Increment the angle for the next position
        angle += angleIncrement;
        if (angle >= 2 * Math.PI) {
          angle -= 2 * Math.PI; // Reset the angle to 0 after a full circle
          circlesCompleted++;

          // Check if two full rotations are completed, then stop
          if (circlesCompleted >= 2) {
            console.log('Completed two full rotations. Stopping movement.');
            isMoving = false; // Stop further movement
            return; // Exit the function
          }
        }

        // Continue moving the player
        setTimeout(() => movePlayerInCircle(target), delay); // Wait before the next step
      } else {
        console.log('Player not found or position data is invalid.');
        console.log('Response structure:', JSON.stringify(pos, null, 2));
      }
    })
    .catch(error => {
      console.error('Error occurred:', error);
    });
}

// Example of calling the function
const targetPlayer = 'gyh'; // Replace 'gyh' with the desired player username or ID
movePlayerInCircle(targetPlayer);

// Log after sending the initial request
console.log('Initial request sent.');

} else if (Command === 'eternal darkness') {
  const positions = [
    '-701.396,159.779,-17.3979988',
    '-665.592957,93.764,-68.3645859'
  ];

  // Function to send the set-home and teleport commands
  function sendSetHomeAndTeleport(position) {
    connection.send(`player set-home ${target} ${position}`);
    connection.send(`player teleport ${target} home`);
  }

  // Loop over positions multiple times to repeat the process
  for (let i = 0; i < 7; i++) {
    sendSetHomeAndTeleport(positions[0]); // Repeating the first position multiple times
  }

  // Finally, send the second position
  sendSetHomeAndTeleport(positions[1]);
  Commands()

}  else if (Command === 'sped') {
  connection.send(`player modify-stat ${target} damage -100 60 true`);

  Commands();
} else if (Command === 'circle') {
  const radius = 5; // Radius of the circle
  let angle = 0; // Start angle in radians
  const speed = 0.1; // Angle increment for each step (controls the speed of rotation)
  let circlesCompleted = 0; // Counter for completed circles
  
  // Function to teleport the player in a circular path
  function teleportInCircle(playerPosition) {
    const x = playerPosition[0] + radius * Math.cos(angle);
    const z = playerPosition[2] + radius * Math.sin(angle);
    const y = playerPosition[1]; // Keep the same Y level
  
    // Format the raw location coordinates
    const rawLocationCoordinates = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
  
    // Update the player's position using set-home to teleport
    connection.send(`player set-home ${target} ${rawLocationCoordinates}`); // Replace 'yourUsername' with the actual username
  
    // Increment the angle for the next position
    angle += speed;
    if (angle >= 2 * Math.PI) {
      angle -= 2 * Math.PI; // Keep the angle within 0 to 2π range
      circlesCompleted++; // Increment the number of completed circles
  
      // Check if two circles are completed, then stop
      if (circlesCompleted >= 2) {
        clearInterval(teleportInterval); // Stop the teleportation loop
        console.log('Completed two full circles. Stopping teleportation.');
      }
    }
  
    console.log(`Teleported player to: ${rawLocationCoordinates}`);
  }
  
  // Function to get the player's current position using the 'player list-detailed' command
  function getPlayerLocationAndTeleport() {
    connection.send('player list-detailed').then(resp => {
      if (resp && resp.data && resp.data.Result) {
        const player = resp.data.Result.find(p => p.username === 'gyh'); // Replace with your actual username
  
        if (player && player.position && player.position.length === 3) {
          const playerPosition = [...player.position]; // Use the player's position
          console.log(`Fetched player position: ${playerPosition}`);
          
          // Start teleporting in a circular path based on the player's current position
          teleportInCircle(playerPosition);
        } else {
          console.log('Player not found or position data is invalid.');
        }
      } else {
        console.log('No player data returned or response is invalid.');
      }
    }).catch(err => {
      console.error('Error getting player location:', err);
    });
  }
  
  // Set an interval to repeatedly fetch the player's location and teleport
  const teleportInterval = setInterval(getPlayerLocationAndTeleport, 500); // Run every 500 milliseconds
} else if (Command === 'brick') {
  connection.send(`player message ${target} "Brick Brick Brick Brick Brick Brick Brick Brick Brick Brick Brick " 20`);
          connection.send(`player kill ${target}`);
          Commands()
} else if (Command === 'bomb') {
  console.log('Bomb command executed.');

  let bombitem = null;
  let isSubscribed = false;
  
  connection.subscribe('InventoryChanged', (bomb) => {
    const { ItemHash, ChangeType, User } = bomb.data;
  
    if (User?.username === owner && ChangeType === 'Drop') {
      bombitem = ItemHash;
      console.log(`Owner ${owner} dropped item with ItemHash: ${bombitem}. This item is now the bomb.`);
  
      if (!isSubscribed) {
        isSubscribed = true;
        console.log('Now listening for someone to pick up the bomb item...');
      }
    } else if (ChangeType === 'Pickup' && ItemHash === bombitem && User?.username !== owner) {
      console.log(`Player ${User.username} picked up the bomb! Initiating kill command.`);
      connection.send(`player kill "${User.username}"`);
      console.log('Unsubscribing from InventoryChanged event after bomb usage.');
      connection.unsubscribe('InventoryChanged');
      isSubscribed = false;
    }
  });
  
}

 else if (Command ==='beemovie') {
  sendMessageInParts(target, messageContent);
 } else if (Command === 'hot potato') {
  console.log('Bomb command executed.');

  let bombItemHash = null;
  let isSubscribed = false;
  let bombHolder = null;
  let grabCount = 0;
  let grabbers = new Set(); // Track players who grabbed the bomb
  let bombSet = false; // Flag to check if the bomb has been set
  let bombTimer = null; // Timer for the bomb countdown
  
  connection.subscribe('InventoryChanged', (bomb) => {
      const { ItemHash, ChangeType, User } = bomb.data;
  
      // Set the bomb ItemHash when dropped by the owner
      if (!bombSet && User?.username === owner && ChangeType === 'Drop') {
          bombItemHash = ItemHash;
          bombHolder = null; // Set to null as no one is holding it after the drop
          grabCount = 0; // Reset the grab count when the bomb is set
          grabbers.clear(); // Clear the set of grabbers
          bombSet = true; // Mark that the bomb has been set
          console.log(`Owner ${owner} dropped an item with ItemHash: ${bombItemHash}. This item is now the bomb with a 15-second timer.`);
  
          if (!isSubscribed) {
              isSubscribed = true;
              console.log('Now listening for someone to pick up the bomb item...');
          }
  
          // Start the bomb timer only once
          if (!bombTimer) {
              startBombTimer(); // Start the bomb timer
          }
      }
  
      // Track when someone picks up the bomb
      if (bombSet && ChangeType === 'Pickup' && ItemHash === bombItemHash) {
          bombHolder = User.username;
          grabCount++;
          grabbers.add(bombHolder); // Add the player to the set of grabbers
          console.log(`Player ${bombHolder} picked up the bomb! This is grab number ${grabCount}.`);
      }
  
      // Track when the bomb is dropped
      if (bombSet && ChangeType === 'Drop' && ItemHash === bombItemHash) {
          bombHolder = null;
          console.log('The bomb has been dropped and is not being held by anyone.');
      }
  });
  
  // Function to start the bomb timer
  function startBombTimer() {
      bombTimer = setTimeout(() => {
          console.log('15-second timer is up! Checking bomb status...');
  
          if (!bombHolder) {
              console.log('The bomb is not being held by anyone. Killing all grabbers.');
              grabbers.forEach(grabber => {
                  connection.send(`player kill "${grabber}"`);
                  console.log(`Player ${grabber} has been killed.`);
              });
          } else {
              console.log(`Player ${bombHolder} is still holding the bomb. Killing ${bombHolder}.`);
              connection.send(`player kill "${bombHolder}"`);
          }
  
          // Cleanup after the bomb timer ends
          connection.unsubscribe('InventoryChanged');
          isSubscribed = false;
          bombSet = false; // Reset bomb set flag for future use
          bombHolder = null;
          bombItemHash = null;
          bombTimer = null; // Clear the timer reference
      }, 15000); // 15-second timer
  }
  
  console.log('Listening for inventory changes...');
  
 } else if  (Command === 'kick') {

  connection.send(`player kick ${target}`);
  Commands();
 } else if (Command === 'smitebomb') {
  console.log('Bomb command executed.');

  // Define a variable to store the bomb item
  let bombitem = null;
  let isSubscribed = false;

  // Step 1: Subscribe to 'InventoryChanged' event to detect both drops and pickups
  connection.subscribe('InventoryChanged', (bomb) => {
    const { ItemHash, ChangeType, User } = bomb.data;

    // Log the full event data for debugging purposes
    console.log(`Full Event Data:`, JSON.stringify(bomb.data, null, 2));

    // Step 2: Check if the owner has dropped an item and set that item as the bomb
    if (User?.username === owner && ChangeType === 'Drop') {
      bombitem = ItemHash; // Set the dropped item as the bomb item
      console.log(`Owner ${owner} dropped item with ItemHash: ${bombitem}. This item is now the bomb.`);

      // Prevent multiple subscriptions
      if (!isSubscribed) {
        isSubscribed = true;
        console.log('Now listening for someone to pick up the bomb item...');
      }

    // Step 3: Check if someone else picks up the bomb item
    } else if (ChangeType === 'Pickup' && ItemHash === bombitem && User?.username !== owner) {
      console.log(`Player ${User.username} picked up the bomb! Initiating kill command.`);
      connection.send(`player downed-duration 0`);
      connection.send('Settings changesetting server DropAllOnDeath true');
      connection.send(`player kill "${User.username}"`);
      connection.send('Settings changesetting server DropAllOnDeath false');
      connection.send('player downed-duration 60');

      // Step 4: Unsubscribe after the bomb has been used (picked up and player killed)
      console.log('Unsubscribing from InventoryChanged event after bomb usage.');
      connection.unsubscribe('InventoryChanged'); // Unsubscribe from the event
      isSubscribed = false; // Reset subscription flag
    }
  });

  console.log('Listening for inventory changes...');
} else  if (Command === 'orbit_around_owner') {
  const orbitRadius = 10; // Radius of orbit around the owner
  const orbitSpeed = 0.05; // Speed of orbit (angle increment per update)
  let angleOffsets = {}; // Store each player's current angle offset

  const orbitInterval = setInterval(() => {
      connection.send('player list-detailed').then(resp => {
          const ownerData = resp.data.Result.find(p => p.username === owner);
          if (!ownerData) {
              console.log('Owner data not found.');
              clearInterval(orbitInterval);
              return;
          }

          const ownerPosition = ownerData.Position;
          resp.data.Result.forEach((player, index) => {
              if (player.username === owner) return; // Skip the owner

              // Initialize each player's angle offset if it doesn't exist
              if (!angleOffsets[player.username]) {
                  angleOffsets[player.username] = (2 * Math.PI / resp.data.Result.length) * index;
              }

              // Update angle offset for orbit movement
              angleOffsets[player.username] += orbitSpeed;

              // Calculate the new X and Z positions based on the orbit radius and updated angle
              const orbitX = ownerPosition[0] + orbitRadius * Math.cos(angleOffsets[player.username]);
              const orbitZ = ownerPosition[2] + orbitRadius * Math.sin(angleOffsets[player.username]);
              const orbitPosition = `${orbitX.toFixed(3)},${player.Position[1]},${orbitZ.toFixed(3)}`;

              // Set the player's new orbit position, teleport, and reset home
              connection.send(`player set-home "${player.username}" ${orbitPosition}`);
              connection.send(`player teleport "${player.username}" home`);
              connection.send(`player set-home "${player.username}" 0,0,0`);
              connection.send(`player message "${player.username}" "You are orbiting around ${owner}!" 5`);
              console.log(`Moved ${player.username} to [${orbitPosition}] in orbit around the owner.`);
          });
      });
  }, 500); // Update positions every 500 milliseconds

  // Stop orbiting after 30 seconds
  setTimeout(() => clearInterval(orbitInterval), 30000);
  Commands();

}



let intervalId = setInterval(async () => {
  if (Command === `starlight`){
      connection.send(`Player progression clearall "${target}"`);
      await new Promise(r => setTimeout(r, 100));
      connection.send(`Player progression allxp "${target}" 9999`);
      await new Promise(r => setTimeout(r, 1000));

      Commands();
    }
  }, 10);
  connection.send(`player modify-stat "${target}" Luminosity 50 10`)
  setTimeout(() => {
    clearInterval(intervalId);
  }, 5000);


  })
}
Commands();
});
