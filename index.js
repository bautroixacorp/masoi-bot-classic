const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
// const app = express()
// const Cosmic = require('cosmicjs')
const BootBot = require('bootbot')
require('dotenv').config()
// const chrono = require('chrono-node')
var schedule = require('node-schedule')
// const EventEmitter = require('events').EventEmitter
// var async = require("async");
// var Q = require("q");
const { Game, Room, Player } = require('./src/Game.js');
const menuTienIch = require('./src/Menu/TienIch');
const menuHelp = require('./src/Menu/Help');

const gamef = new Game();
const bot = new BootBot({
  accessToken: process.env.ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  appSecret: process.env.APP_SECRET
})

// bot config
bot.setGreetingText("Chào mừng bạn đến với Phạm Ngọc Duy GAME bot, hãy bắt đầu trò chơi :3")
bot.setGetStartedButton((payload, chat) => {
  chat.say('🐺MA SÓI GAME').then(() => {
    chat.say({
      text: `Chào mừng bạn, để bắt đầu hãy chat 'help' hoặc 'trợ giúp' để được hướng dẫn cách chơi!'`,
      quickReplies: ['help', 'trợ giúp'],
    });
  })

});
const actionButtons = [
  {
    type: 'nested', title: 'Tham gia...',
    call_to_actions: [
      { type: 'postback', title: 'Tham gia phòng', payload: 'JOIN_ROOM' },
      { type: 'postback', title: 'Sẵn sàng!', payload: 'READY_ROOM' },
      { type: 'postback', title: 'Rời phòng/Tự sát', payload: 'LEAVE_ROOM' },
    ]
  },
  {
    type: 'nested', title: 'Tiện ích khi chơi...',
    call_to_actions: [
      { type: 'postback', title: 'Đổi tên', payload: 'USER_RENAME' },
      { type: 'postback', title: 'Xem DS dân làng', payload: 'VIEW_PLAYER_IN_ROOM' },
      { type: 'postback', title: '(ADMIN ONLY) COMMAND', payload: 'ADMIN_COMMAND' },
    ]
  },
  { type: 'postback', title: 'Trợ giúp', payload: 'HELP' },
];
bot.setPersistentMenu(actionButtons, false);


//import module
gamef.module(menuTienIch, bot);
gamef.module(menuHelp, bot);


// const eventEmitter = new EventEmitter()

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
async function roomChatAll(roomID, sendID, content) {
  await asyncForEach(gamef.getRoom(roomID).players, async (m) => {
    if (m && m.joinID != sendID) {
      await bot.say(m.joinID, content);
    }
  })
}
async function roomWolfChatAll(roomID, sendID, content) {
  await asyncForEach(gamef.getRoom(roomID).wolfsID, async (m) => {
    if (m != sendID) {
      await bot.say(m, content);
    }
  })
}
async function roomRoleChat(roomID) {
  await asyncForEach(gamef.getRoom(roomID).players, async (m) => {
    if (m && gamef.getRoom(roomID).alivePlayer[m.joinID]) {
      console.log(`$ ROOM ${roomID + 1} > ${gamef.roleTxt[m.role]} > ${m.first_name}`);
      let wolfList = gamef.getRoom(roomID).wolfsTxt.join(' ; ');
      let villagersList = gamef.getRoom(roomID).villagersTxt.join(' ; ');
      let playersList = gamef.getRoom(roomID).playersTxt.join(' ; ');
      if (m.role == -1) {//SÓI
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/masoi.jpg'
        }, `🐺Sói ơi dậy đi! Đêm nay sói muốn cắn ai?\n/vote <id> để cắn 1 ai đó\n👨‍👩‍👦‍👦ID CẢ LÀNG:\n${playersList}\n🐺ID TEAM SÓI:\n${wolfList}\n💩ID TEAM DÂN:\n${villagersList}`]);
      } else if (m.role == 1) { // tiên tri
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/11-18/tien-tri.jpg'
        }, `🔍Tiên tri dậy đi! Tiên tri muốn kiểm tra ai?\n/see <id> để kiểm tra\n${playersList}`]);
      } else if (m.role == 2) { // Bảo vệ
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/baove.jpg'
        }, `🗿Bảo vệ dậy đi! Đêm nay bạn muốn bảo vệ ai?\n/save <id> để bảo vệ\n${playersList}`]);
      } else if (m.role == 3) { // Thợ săn
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/thosan.jpg'
        }, `🔫Thợ săn dậy đi! Đêm nay bạn muốn bắn ai?\n/fire <id> để ngắm bắn\n${playersList}`]);
      } else if (m.role == 4) { // Bán sói
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/phanboi.jpg'
        }, `🐺Bạn là BÁN SÓI!\nBạn vẫn còn là DÂN! Ngủ tiếp đi!\nID CẢ LÀNG:\n${playersList}`]);
        gamef.getRoom(roomID).roleDoneBy(m.joinID);
      } else if (m.role == 5) { // Phù thủy
        let sayTxt;
        if (gamef.getRoom(roomID).witchKillRemain) {
          sayTxt = `🔮Bạn là Phù thủy!\n${gamef.getRoom(roomID).witchSaveRemain ? '☑Bạn còn quyền cứu' : '⛔Bạn đã dùng quyền cứu!'}\n☑/kill <id> để giết\n☑/skip để bỏ qua\n${playersList}`;
        } else {
          sayTxt = `🔮Bạn là Phù thủy!\n${gamef.getRoom(roomID).witchSaveRemain ? '☑Bạn còn quyền cứu' : '⛔Bạn đã dùng quyền cứu!'}\n⛔Bạn đã dùng quyền giết!\n${playersList}`;
          gamef.getRoom(roomID).roleDoneBy(m.joinID);
        }
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/phuthuy.jpg'
        }, sayTxt]);
      } else {
        bot.say(m.joinID, [{
          attachment: 'image',
          url: 'http://hstatic.net/936/1000019936/10/2015/7-28/danlang.jpg'
        }, `💩Bạn là DÂN! Ngủ tiếp đi :))\n👨‍👩‍👦‍👦ID CẢ LÀNG:\n${playersList}`]);
        gamef.getRoom(roomID).roleDoneBy(m.joinID);
      }
    } else {
      bot.say(m.joinID, "Đêm nay bạn đã chết =))");
    }
  })
}
async function yesNoVoteCheck(userRoom) {
  gamef.getRoom(userRoom).roleIsDone(async () => {
    gamef.getRoom(userRoom).cancelSchedule();
    let deathID = gamef.getRoom(userRoom).deathID;
    let deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
    if (gamef.getRoom(userRoom).saveOrKill < 0) {
      gamef.getRoom(userRoom).kill();
      roomChatAll(userRoom, 0, `👻Đã treo cổ ${deathTxt}! Mọi người đi ngủ`);
      gamef.getRoom(userRoom).newLog(`👻Mọi người đã treo cổ (${deathTxt})! với ${(gamef.getRoom(userRoom).aliveCount() + 1 + gamef.getRoom(userRoom).saveOrKill) / 2} tha/${(gamef.getRoom(userRoom).aliveCount() + 1 - gamef.getRoom(userRoom).saveOrKill) / 2} treo`);
    } else {
      roomChatAll(userRoom, 0, `😇Đã tha chết cho ${deathTxt}! Mọi người đi ngủ`);
      gamef.getRoom(userRoom).newLog(`😇Mọi người tha chết cho (${deathTxt}) với ${(gamef.getRoom(userRoom).aliveCount() + gamef.getRoom(userRoom).saveOrKill) / 2} tha/${(gamef.getRoom(userRoom).aliveCount() - gamef.getRoom(userRoom).saveOrKill) / 2} treo`);
    }
    gameIsNotEndCheck(userRoom, async () => {
      // Đêm tiếp theo
      gamef.getRoom(userRoom).dayNightSwitch();
      roomChatAll(userRoom, 0, `🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛`);
      gamef.getRoom(userRoom).newLog(`🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛++++++++++`);
      roomRoleChat(userRoom);
    });
  })
}
async function dayNotify(userRoom, witchSaved) {
  let deathID = gamef.getRoom(userRoom).deathID;
  let deathTxt, deathRole;
  if (deathID != -1) {
    deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
    deathRole = gamef.roleTxt[gamef.getRoom(userRoom).getRoleByID(deathID)];
  }
  let dieCount = 0;

  roomChatAll(userRoom, 0, `🌞Trời sáng rồi mọi người dậy đi`);
  // SÓI CẮN
  if (!witchSaved && gamef.getRoom(userRoom).kill()) {
    dieCount++;
    roomChatAll(userRoom, 0, `🔪 *${deathTxt}* đã CHẾT!`);
    gamef.getRoom(userRoom).newLog(`🔪 *${deathTxt}* là ${deathRole} đã bị SÓI cắn!`);
    console.log(`$ ROOM ${userRoom + 1} > ${deathTxt} DIED!`);
    if (gamef.getRoom(userRoom).players[deathID].role === 3) { //người chết là thợ săn
      dieCount++;
      let fireID = gamef.getRoom(userRoom).fireID;
      let deathFireTxt = gamef.getRoom(userRoom).playersTxt[fireID];
      roomChatAll(userRoom, 0, `🔪 *${deathFireTxt}* đã CHẾT!`);
      gamef.getRoom(userRoom).newLog(`🔪Thợ săn chết đã ghim ${gamef.roleTxt[gamef.getRoom(userRoom).getRoleByID(fireID)]} *${deathFireTxt}*`);
      console.log(`$ ROOM ${userRoom + 1} > ${deathFireTxt} DIED!`);
    }
  }
  // PHÙ THỦY giết
  if (gamef.getRoom(userRoom).witchKillID != undefined) {
    let killID = gamef.getRoom(userRoom).witchKillID;
    let deathByMagicTxt = gamef.getRoom(userRoom).playersTxt[killID];
    gamef.getRoom(userRoom).witchKillAction(async (witchKillID) => {
      dieCount++;
      roomChatAll(userRoom, 0, `🔪 *${deathByMagicTxt}* đã CHẾT!`);
      gamef.getRoom(userRoom).newLog(`🔪Phù thủy đã phù phép chết ${gamef.roleTxt[gamef.getRoom(userRoom).getRoleByID(witchKillID)]} *${deathByMagicTxt}*`);
      console.log(`$ ROOM ${userRoom + 1} > ${witchKillID}: ${deathByMagicTxt} DIED by witch!`);
    });
  }
  //là BÁN SÓI
  if (deathID != -1 && gamef.getRoom(userRoom).players[deathID].role == 4) {
    let halfWolfjoinID = gamef.getRoom(userRoom).players[deathID].joinID;
    let halfWolfTxt = gamef.getRoom(userRoom).players[deathID].first_name;
    await bot.say(halfWolfjoinID, `\`\`\`\nBạn đã bị sói cắn!\nTừ giờ bạn là 🐺SÓI!\n\`\`\``);
    gamef.getRoom(userRoom).players[deathID].setRole(-1);
    gamef.getRoom(userRoom).newLog(`🐺BÁN SÓI *${halfWolfTxt}* bị cắn và trở thành 🐺SÓI`);
    console.log(`$ ROOM ${userRoom + 1} > HALF WOLF!`);
  }
  if (dieCount == 0) {
    console.log(`$ ROOM ${userRoom + 1} > NOBODY DIED!`);
    gamef.getRoom(userRoom).newLog(`${deathID != -1 ? `🔪 *${deathTxt}* bị cắn nhưng không chết!\n` : `🎊Sói không thống nhất được số vote!\n`}🎊Đêm hôm đấy không ai chết cả!`);
    roomChatAll(userRoom, 0, `🎊Đêm hôm qua không ai chết cả!`);
  }

  gameIsNotEndCheck(userRoom, () => {
    let playersInRoomTxt = gamef.getRoom(userRoom).playersTxt.join(' ; ');
    roomChatAll(userRoom, 0, `⏰Mọi người có 6 phút thảo luận!`);
    gamef.getRoom(userRoom).dayNightSwitch();

    let time = new Date(Date.now() + 5 * 60 * 1000);
    gamef.getRoom(userRoom).addSchedule(time, () => {
      roomChatAll(userRoom, 0, `⏰CÒN 1 PHÚT THẢO LUẬN\nCác bạn nên cân nhắc kĩ, tránh lan man, nhanh chóng tìm ra kẻ đáng nghi nhất!`);
      console.log(`$ ROOM ${userRoom + 1} > 1 MINUTE REMAINING`);
      let time = new Date(Date.now() + 1 * 60 * 1000);
      gamef.getRoom(userRoom).addSchedule(time, () => {
        roomChatAll(userRoom, 0, `⏰Đã hết thời gian, mọi người vote một người để treo cổ!\n/vote <id> để treo cổ 1 người\n${playersInRoomTxt}`);
        gamef.getRoom(userRoom).chatOFF();
        console.log(`$ ROOM ${userRoom + 1} > END OF DISCUSSION!`);
      });
    });
  });
}
function nightDoneCheck(userRoom) {
  gamef.getRoom(userRoom).roleIsDone((isDone) => {
    if (isDone) {
      gamef.getRoom(userRoom).findOutDeathID();
      let deathID = gamef.getRoom(userRoom).deathID;
      let deathTxt;
      if (deathID != -1) {
        deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
      }

      const askForSave = (convo) => {
        convo.ask({
          text: `🔪Đêm hôm qua: *${deathTxt}* đã CHẾT!\nBạn có muốn cứu không?\n/yes hay /no ?`,
          quickReplies: ['/yes', '/no'],
        }, (payload, convo) => {
          if (!payload.message || !(payload.message.text.match(/\/yes/g) || payload.message.text.match(/\/no/g))) {
            convo.say(`\`\`\`\nKhông hợp lệ!\nBạn đã không cứu!\n\`\`\``);
            convo.end();
            dayNotify(userRoom, false);
            return;
          } else {
            if (payload.message.text.match(/\/yes/g)) { //yes
              gamef.getRoom(userRoom).witchUseSave();
              convo.say(`🔮Bạn đã cứu *${deathTxt}* thành công!`);
              gamef.getRoom(userRoom).newLog(`🔮Phù thủy *${gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).witchID).first_name}* đã cứu *${deathTxt}*!`);
              convo.end();
              dayNotify(userRoom, true);
            } else { // no
              convo.end();
              dayNotify(userRoom, false);
            }
          }
        });
      };

      //Call phù thủy
      if (deathID != -1 && gamef.getRoom(userRoom).players[deathID].role != 4 && gamef.getRoom(userRoom).witchID != undefined && gamef.getRoom(userRoom).witchSaveRemain) { //phù thủy còn quyền cứu, nạn nhân không phải bán sói
        bot.conversation(gamef.getRoom(userRoom).witchID, (convo) => {
          askForSave(convo);
        });
      } else {
        dayNotify(userRoom, false);
      }
    }
  });
}
function gameIsNotEndCheck(userRoom, callback) {
  gamef.getRoom(userRoom).gameIsEnd((winner) => {
    const winnerStart = async () => {
      if (winner === 0) {
        callback();
      } else {
        console.log(`$ ROOM ${userRoom + 1} > END GAME > ${winner === -1 ? '🐺SÓI' : '💩DÂN'} thắng!`);
        await roomChatAll(userRoom, 0, [`🏆Trò chơi đã kết thúc...\n${winner === -1 ? '🐺SÓI' : '💩DÂN'} thắng!`, `🎮Bạn có thể sẵn sàng để bắt đầu chơi lại, hoặc tiếp tục trò chuyện với các người chơi khác trong phòng!`]);
        gamef.getRoom(userRoom).newLog(`🏆Trò chơi đã kết thúc với: ${gamef.getRoom(userRoom).wolfsCount} SÓI/ ${gamef.getRoom(userRoom).villagersCount} DÂN!`)
        await roomChatAll(userRoom, 0, gamef.getRoom(userRoom).logs.join(`\n`));
        //subscriber
        console.log(`$ ROOM ${userRoom + 1} > SUBSCRIBE REMINDER FOR ${gamef.getRoom(userRoom).subscriberList.length} PLAYERS`);
        gamef.getRoom(userRoom).subscriberList.forEach((joinID) => {
          bot.say(joinID, `Trò chơi ở phòng ${userRoom + 1} đã kết thúc!\nHãy nhanh chóng tham gia phòng trước khi trò chơi bắt đầu lại!`);
          console.log(`>>> REMINDER: ${joinID}`);
        });
        gamef.getRoom(userRoom).resetRoom();
      }
    }
    winnerStart();
  });
}

function dayVoteEnd(userRoom) {
  const newStart = async () => {
    gamef.getRoom(userRoom).findOutDeathID();
    gamef.getRoom(userRoom).cancelSchedule();
    let deathID = gamef.getRoom(userRoom).deathID;
    if (deathID != -1 && gamef.getRoom(userRoom).alivePlayer[gamef.getRoom(userRoom).players[deathID].joinID]) { // mời 1 người lên giá treo cổ
      gamef.getRoom(userRoom).resetRoleDone();
      gamef.getRoom(userRoom).setMorning(false);
      let deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
      roomChatAll(userRoom, 0, `😈Mời ${deathTxt} lên giá treo cổ !!!\n⏰Bạn có 1 phút để trăn trối\n1 PHÚT bắt đầu!`);
      // 1 phút trăn trối
      let time = new Date(Date.now() + 1 * 60 * 1000);
      gamef.getRoom(userRoom).addSchedule(time, () => {
        roomChatAll(userRoom, 0, `⏰Đã hết thời gian, mọi người vote nào!\n👎TREO CỔ hay 👍CỨU?\n/yes hoặc /no`);
        console.log(`$ ROOM ${userRoom + 1} > END OF TRĂN TRỐI :))`);
      });
    } else {
      await roomChatAll(userRoom, 0, `😇Không ai bị treo cổ do có số vote bằng nhau hoặc người bị treo đã tự sát! Mọi người đi ngủ`);
      gamef.getRoom(userRoom).newLog(`😇Không ai bị treo cổ do có số vote bằng nhau hoặc người bị treo đã tự sát!`);
      gameIsNotEndCheck(userRoom, () => {
        const start2 = async () => {
          // Đêm tiếp theo
          gamef.getRoom(userRoom).dayNightSwitch();
          await roomChatAll(userRoom, 0, `🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛`);
          gamef.getRoom(userRoom).newLog(`🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛++++++++++`);
          await roomRoleChat(userRoom);
        };
        start2();
      });
    }
  }
  newStart();
}

// listen JOIN ROOM
bot.on('postback:JOIN_ROOM', (payload, chat) => {
  let joinID = payload.sender.id;
  let userRoom = gamef.getUserRoom(joinID);
  if (userRoom != undefined) {
    chat.say(`\`\`\`\nBạn đã tham gia phòng ${(userRoom + 1)} rồi!\nĐể rời phòng chơi, chọn menu Tham gia > Rời phòng chơi!\n\`\`\``);
    return;
  }
  let joinUser;
  let roomListView = gamef.getRoomListView();

  const askRoom = (convo) => {
    convo.ask({
      text: 'Lựa chọn phòng',
      quickReplies: roomListView,
    }, (payload, convo) => {
      if (!(payload.message) || isNaN(parseInt(payload.message.text))) {
        convo.say(`\`\`\`\nVui lòng nhập 1 phòng hợp lệ!\n\`\`\``);
        convo.end();
        return;
      }
      let roomTxt = payload.message.text
      let roomID = parseInt(roomTxt) - 1;

      if (gamef.getRoom(roomID).ingame) {
        convo.say(`\`\`\`\nPhòng đã vào chơi rồi! Bạn sẽ được thông báo khi trò chơi kết thúc!\n\`\`\``);
        gamef.getRoom(roomID).subscribe(joinID);
        convo.end();
        return;
      } else {
        // save room number for user
        gamef.setUserRoom(joinID, roomID);
        // add new player to room
        gamef.getRoom(roomID).addPlayer(new Player({
          id: gamef.getRoom(roomID).newPlayerID(),
          joinID: joinID,
          last_name: joinUser.last_name,
          first_name: joinUser.first_name,
          avatar: joinUser.profile_pic
        }));
        // notice new player to everyone in room
        const start = async () => {
          let playerListView = gamef.getRoomPlayerView(roomID);
          await asyncForEach(gamef.getRoom(roomID).players, async (m) => {
            if (m) {
              await bot.sendGenericTemplate(m.joinID, playerListView).then(async () => {
                await bot.say(m.joinID, `${joinUser.first_name} đã tham gia phòng!`);
              })
            }
          })
          convo.end();
          console.log(`$ ROOM ${(roomID + 1)} > JOIN > ${joinID}`);
        }
        start();
      }
    });
  };

  chat.getUserProfile().then((user) => {
    console.log(`$ JOIN > ${joinID} : ${user.last_name + ' ' + user.first_name}`);
    joinUser = user;
    chat.conversation((convo) => {
      askRoom(convo);
    });
  })
});
//listen for READY
bot.on('postback:READY_ROOM', (payload, chat) => {
  const joinID = payload.sender.id;
  const userRoom = gamef.getUserRoom(joinID);
  if (userRoom != undefined) {
    console.log("$ ROOM " + (userRoom + 1) + " > READY > " + joinID);
    // set status READY
    joinUser = gamef.searchUserInRoom(joinID, userRoom);
    if (!joinUser.ready) {
      joinUser.getReady();
      gamef.getRoom(userRoom).oneReady();
      // get UserName and sendGlobalMessage to ROOM
      user = gamef.getRoom(userRoom).getPlayer(joinID);
      const start = async () => {
        await asyncForEach(gamef.getRoom(userRoom).players, async (m) => {
          if (m) {
            bot.say(m.joinID, `${user.first_name} đã sẵn sàng! (${gamef.getRoom(userRoom).readyCount}/${gamef.getRoom(userRoom).players.length})`)
          }
        })
        gamef.gameIsReady(userRoom, (gameReady) => {
          if (gameReady && !gamef.getRoom(userRoom).ingame) {
            const gameStart = async () => {
              console.log(`$ ROOM ${userRoom + 1} > GAME_START`);
              gamef.getRoom(userRoom).setInGame();
              let roleListTxt = gamef.roleRandom(userRoom);
              await roomChatAll(userRoom, 0, [`Tất cả mọi người đã sẵn sàng! Game sẽ bắt đầu...`, roleListTxt]);
              //while(){
              gamef.getRoom(userRoom).dayNightSwitch();
              await roomChatAll(userRoom, 0, `🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛`);
              gamef.getRoom(userRoom).newLog(`🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛++++++++++`);
              await roomRoleChat(userRoom);
              //}
            }
            gameStart();
          }
        });
      }
      start();
    } else {
      chat.say("```\nBạn đã sẵn sàng rồi!\n```");
    }
  } else {
    chat.say("```\nBạn chưa tham gia phòng nào!\n```");
  }
});

// listen for ROOM CHAT and VOTE
bot.on('message', (payload, chat, data) => {
  if (data.captured) { return; }

  const joinID = payload.sender.id;
  const chatTxt = payload.message.text;
  const userRoom = gamef.getUserRoom(joinID);

  if (userRoom == undefined) {
    chat.say({
      text: `\`\`\`\nBạn chưa tham gia phòng chơi nào!\n\`\`\``,
      quickReplies: ['help', 'trợ giúp']
    });
    return;
  }

  if (gamef.getRoom(userRoom).alivePlayer[joinID]) { // nếu còn sống
    user = gamef.getRoom(userRoom).getPlayer(joinID);
    if (gamef.getRoom(userRoom).isNight) { // ban đêm
      let userRole = gamef.getRoom(userRoom).getRole(joinID);
      if (userRole == -1) {// là SÓI
        if (!chatTxt.match(/\/vote.-?[0-9]+/g)) {//chat
          if (gamef.getRoom(userRoom).chatON) {
            roomWolfChatAll(userRoom, joinID, '*' + user.first_name + '*: ' + chatTxt);
          }
        } else {// SÓI VOTE
          let voteID = chatTxt.match(/-?[0-9]+/g)[0];
          const start = async () => {
            //vote
            if (gamef.getRoom(userRoom).vote(joinID, voteID)) {
              if (voteID == -1) { //ăn chay (phiếu trống)
                await chat.say(`🍴Bạn đã vote ăn chay!`);
                roomWolfChatAll(userRoom, joinID, '🍴' + user.first_name + ' đã vote ăn chay!');
              } else {
                let voteKill = gamef.getRoom(userRoom).playersTxt[voteID];
                await chat.say(`🍗Bạn đã vote cắn ${voteKill}`);
                roomWolfChatAll(userRoom, joinID, '🍗' + user.first_name + ' đã vote cắn ' + voteKill);
              }
            } else {
              chat.say("```\nBạn không thể thực hiện vote 2 lần hoặc vote người chơi đã chết!\n```");
            }
            // kiểm tra đã VOTE xong chưa?
            nightDoneCheck(userRoom);
          }
          start();
        }
      } else if (userRole == 1) { // là tiên tri
        if (chatTxt.match(/\/see.[0-9]+/g)) {//see
          const startTT = async () => {
            if (!gamef.getRoom(userRoom).roleDone[joinID]) { // chưa soi ai
              let voteID = chatTxt.match(/[0-9]+/g)[0];
              let role = gamef.getRoom(userRoom).getRoleByID(voteID);
              await chat.say(`${voteID} là ${role == -1 ? '🐺SÓI' : role == 1 ? '🔍TIÊN TRI, Bạn đùa tớ à :v' : '💩PHE DÂN'}`);
              gamef.getRoom(userRoom).newLog(`🔍${user.first_name} soi *${gamef.getRoom(userRoom).playersTxt[voteID]}* ra ${role == -1 ? '🐺SÓI' : role == 1 ? 'TỰ SOI MÌNH! GG' : '💩PHE DÂN'}`);
              gamef.getRoom(userRoom).roleDoneBy(joinID);
            } else {
              chat.say('```\nBạn không thể soi 2 lần!\n```');
            }
            // kiểm tra đã VOTE xong chưa?
            nightDoneCheck(userRoom);
          }
          startTT();
        } else {
          chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
        }
      } else if (userRole == 2) { // là bảo vệ
        if (chatTxt.match(/\/save.[0-9]+/g)) {//save
          let voteID = chatTxt.match(/[0-9]+/g)[0];
          if (!gamef.getRoom(userRoom).save(joinID, voteID)) {
            chat.say(`\`\`\`\nBạn không thể bảo vệ 1 người 2 đêm liên tiếp hoặc bảo vệ người chơi đã chết!\n\`\`\``);
          } else {
            chat.say(`🗿Bạn đã bảo vệ ${gamef.getRoom(userRoom).playersTxt[voteID]}!`);
            // kiểm tra đã VOTE xong chưa?
            nightDoneCheck(userRoom);
          }
        } else {
          chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
        }
      } else if (userRole == 3) { // là thợ săn
        if (chatTxt.match(/\/fire.-?[0-9]+/g)) {//fire
          let voteID = chatTxt.match(/-?[0-9]+/g)[0];
          if (!gamef.getRoom(userRoom).fire(joinID, voteID)) {
            chat.say(`\`\`\`\nBạn không thể ngắm bắn 1 người 2 đêm liên tiếp hoặc người chơi đã chết!\n\`\`\``);
          } else {
            if (voteID != -1) {
              chat.say(`🔫Bạn đã ngắm bắn ${gamef.getRoom(userRoom).playersTxt[voteID]}!`);
              gamef.getRoom(userRoom).newLog(`🔫Thợ săn đã ngắm bắn ${gamef.getRoom(userRoom).playersTxt[voteID]}!`);
            } else {
              chat.say(`🔫Bạn đã ngắm bắn lên trời!`);
              gamef.getRoom(userRoom).newLog(`🔫Thợ săn đã ngắm bắn lên trời!`)
            }

            // kiểm tra đã VOTE xong chưa?
            nightDoneCheck(userRoom);
          }
        } else {
          chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
        }
      } else if (userRole == 5) { // là phù thủy
        if (gamef.getRoom(userRoom).witchKillRemain) {
          if (chatTxt.match(/\/kill.[0-9]+/g)) {// giết
            let voteID = chatTxt.match(/[0-9]+/g)[0];
            if (!gamef.getRoom(userRoom).witchKillVote(voteID)) {
              chat.say(`\`\`\`\nBạn không thể giết người chơi đã chết!\n\`\`\``);
            } else {
              chat.say(`⛔Bạn đã giết ${gamef.getRoom(userRoom).playersTxt[voteID]}!`);
              gamef.getRoom(userRoom).roleDoneBy(joinID);
              gamef.getRoom(userRoom).newLog(`⛔Phù thủy ${gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).witchID).first_name} đã giết ${gamef.getRoom(userRoom).playersTxt[voteID]}!`)
              // kiểm tra đã VOTE xong chưa?
              nightDoneCheck(userRoom);
            }
          } else if (chatTxt.match(/\/skip/g)) {
            chat.say('🎊Bạn đã không giết ai!');
            gamef.getRoom(userRoom).roleDoneBy(joinID);
            // kiểm tra đã VOTE xong chưa?
            nightDoneCheck(userRoom);
          } else {
            chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
          }
        } else {
          chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
        }
      }
    } else {
      if (!gamef.getRoom(userRoom).isNight) {// ban NGÀY, mọi người thảo luận
        if (!chatTxt.match(/\/vote.-?[0-9]+/g)) {
          if (!chatTxt.match(/\/yes/g) && !chatTxt.match(/\/no/g)) {
            if (gamef.getRoom(userRoom).chatON || (gamef.getRoom(userRoom).deathID != -1 && gamef.getRoom(userRoom).deathID === gamef.getRoom(userRoom).getPlayer(joinID).id)) { //check xem còn bật chat không?
              roomChatAll(userRoom, joinID, '*' + user.first_name + '*: ' + chatTxt);
            } else {
              chat.say('```\nBạn không thể trò chuyện\n```');
            }
          } else {  //VOTE YES?NO
            if (gamef.getRoom(userRoom).deathID != -1) {
              if (chatTxt.match(/\/yes/g)) { //vote treo cổ
                gamef.getRoom(userRoom).killOrSaveVote(joinID, true);
                chat.say(`👎Bạn đã vote treo! (${gamef.getRoom(userRoom).saveOrKill})`);
                roomChatAll(userRoom, joinID, `👎${user.first_name} đã vote treo! (${gamef.getRoom(userRoom).saveOrKill})`);
                yesNoVoteCheck(userRoom);
              } else { //vote tha
                gamef.getRoom(userRoom).killOrSaveVote(joinID, false);
                chat.say(`👍Bạn đã vote tha! (${gamef.getRoom(userRoom).saveOrKill})`);
                roomChatAll(userRoom, joinID, `👍${user.first_name} đã vote tha! (${gamef.getRoom(userRoom).saveOrKill})`);
                yesNoVoteCheck(userRoom);
              }
            }
          }
        } else {
          // VOTE TREO CỔ
          let voteID = chatTxt.match(/-?[0-9]+/g)[0];
          const start = async () => {
            if (gamef.getRoom(userRoom).vote(joinID, voteID)) {
              if (voteID == -1) {
                await chat.say(`Bạn đã từ chối bỏ phiếu!`);
                await roomChatAll(userRoom, joinID, `${user.first_name} đã từ chối bỏ phiếu (${gamef.getRoom(userRoom).voteList[voteID]} phiếu)`);
              } else {
                let voteKill = gamef.getRoom(userRoom).playersTxt[voteID];
                await chat.say(`😈Bạn đã vote treo cổ ${voteKill} (${gamef.getRoom(userRoom).voteList[voteID]} phiếu)`);
                await roomChatAll(userRoom, joinID, `😈${user.first_name} đã vote treo cổ ${voteKill} (${gamef.getRoom(userRoom).voteList[voteID]} phiếu)`);
              }
            } else {
              chat.say('```\nBạn không thể vote 2 lần hoặc vote người chơi đã chết!\n```');
            }
            // kiểm tra đã VOTE XONG chưa?
            gamef.getRoom(userRoom).roleIsDone((isDone) => {
              if (isDone) {
                dayVoteEnd(userRoom);
              }
            });
          }
          start();
        }
      }
    }
  } else {
    chat.say('```\nBạn đã chết! Xin giữ im lặng! \n```')
  }
  console.log(`$ ROOM ${userRoom + 1} CHAT > ${joinID}: ${chatTxt}`);
});

bot.on('attachment', (payload, chat) => {
  let joinID = payload.sender.id;
  const userRoom = gamef.getUserRoom(joinID);
  let img = payload.message.attachments[0];
  if (img.type != 'image') {
    chat.say(`\`\`\`\nNội dung bạn vừa gửi không được Bot hỗ trợ!\n\`\`\``);
    if (userRoom != undefined) {
      console.log(`$ ROOM ${userRoom + 1} CHAT > ${joinID}: not support content`);
      console.log(JSON.stringify(payload.message.attachments));
      let user = gamef.getRoom(userRoom).getPlayer(joinID);
      roomChatAll(userRoom, joinID, `*${user.first_name}* đã gửi nội dung không được hỗ trợ!`);
    }
  } else {
    if (userRoom != undefined) {
      if (gamef.getRoom(userRoom).alivePlayer[joinID]) { // nếu còn sống
        user = gamef.getRoom(userRoom).getPlayer(joinID);
        if (gamef.getRoom(userRoom).isNight) { // ban đêm
          let userRole = gamef.getRoom(userRoom).getRole(joinID);
          if (userRole == -1) {// là SÓI
            if (gamef.getRoom(userRoom).chatON) {
              roomWolfChatAll(userRoom, joinID, [`*${user.first_name}* đã gửi 1 sticker/ảnh/gif ...`, {
                attachment: 'image',
                url: img.payload.url
              }]);
            }
          } else { // là các role khác
            chat.say('```\nBạn không thể trò chuyện trong đêm!\n```');
          }
        } else {
          // ban NGÀY, mọi người thảo luận
          if (gamef.getRoom(userRoom).chatON || (gamef.getRoom(userRoom).deathID != -1 && gamef.getRoom(userRoom).deathID === gamef.getRoom(userRoom).getPlayer(joinID).id)) { //check xem còn bật chat không?
            roomChatAll(userRoom, joinID, [`*${user.first_name}* đã gửi 1 sticker/ảnh/gif ...`, {
              attachment: 'image',
              url: img.payload.url
            }]);
          } else {
            chat.say('```\nBạn không thể trò chuyện\n```');
          }
        }
      } else {
        chat.say('```\nBạn đã chết! Xin giữ im lặng! \n```')
      }
      console.log(`$ ROOM ${userRoom + 1} CHAT > ${joinID}: IMAGE content`);
    }
  }
});

// listen LEAVE ROOM message
bot.on('postback:LEAVE_ROOM', (payload, chat) => {
  let joinID = payload.sender.id;
  const userRoom = gamef.getUserRoom(joinID);
  if (userRoom != undefined) {
    let user = gamef.getRoom(userRoom).getPlayer(joinID);
    let leaveRole;
    if (!gamef.getRoom(userRoom).ingame) {
      gamef.getRoom(userRoom).deletePlayer(joinID);
      gamef.setUserRoom(joinID, undefined);
      chat.say(`Bạn đã rời phòng chơi ${userRoom + 1}!`);
      roomChatAll(userRoom, joinID, `${user.first_name} đã rời phòng chơi ${userRoom + 1}!`);
    } else {
      gamef.getRoom(userRoom).killAction(user.id);
      leaveRole = user.role;
      chat.say(`\`\`\`\nBạn đã tự sát!\n\`\`\``);
      roomChatAll(userRoom, joinID, `\`\`\`\n${user.first_name} đã tự sát với vai trò là: ${leaveRole == -1 ? '🐺SÓI' : leaveRole == 1 ? '🔍TIÊN TRI' : leaveRole == 2 ? '🗿BẢO VỆ' : leaveRole == 3 ? '🔫THỢ SĂN' : '💩DÂN THƯỜNG'}\n\`\`\``);
      gamef.getRoom(userRoom).newLog(`\`\`\`\n${user.first_name} đã tự sát với vai trò là: ${leaveRole == -1 ? '🐺SÓI' : leaveRole == 1 ? '🔍TIÊN TRI' : leaveRole == 2 ? '🗿BẢO VỆ' : leaveRole == 3 ? '🔫THỢ SĂN' : '💩DÂN THƯỜNG'}\n\`\`\``);
      if (gamef.getRoom(userRoom).isNight) {
        gamef.getRoom(userRoom).roleIsDone((isDone) => {
          if (isDone) {
            nightDoneCheck(userRoom);
          }
        });
      } else if (gamef.getRoom(userRoom).isMorning) {
        gamef.getRoom(userRoom).roleIsDone((isDone) => {
          if (isDone) {
            dayVoteEnd(userRoom);
          }
        });
      } else {
        gamef.getRoom(userRoom).roleIsDone((isDone) => {
          if (isDone) {
            yesNoVoteCheck(userRoom);
          }
        });
      }
    }
    console.log(`$ ROOM ${userRoom + 1} > LEAVE > ${joinID} : ${user.first_name}`);
  } else {
    chat.say('```\nBạn chưa tham gia phòng nào!\n```');
  }
});

// listen ADMIN_COMMAND message
bot.on('postback:ADMIN_COMMAND', (payload, chat) => {
  let joinID = payload.sender.id;

  const askCMD = (convo) => {
    convo.ask(`Các lệnh cơ bản:\nĐể reset 2 phòng: /resetAll\nĐể kick người chơi: /kick <RoomID> <userID>\nHủy: /cancel`, (payload, convo) => {
      if (!payload.message) {
        convo.say('```\nVui lòng nhập lệnh hợp lệ\n```');
        convo.end();
        return;
      } else {
        const chatTxt = payload.message.text;
        if (chatTxt.match(/\/resetAll/g)) {
          gamef.resetAllRoom();
          chat.say('Đã tạo lại các phòng chơi và xóa các người chơi!');
          console.log('$ ROOM > RESET_ALL');
          convo.end();
        } else if (chatTxt.match(/\/kick.[0-9]+.[0-9]+/g)) {
          let roomID = chatTxt.match(/[0-9]+/g)[0] - 1;
          let userID = chatTxt.match(/[0-9]+/g)[1];
          let leaveRole;
          let player = gamef.getRoom(roomID).players[userID];
          let playerJoinID = player.joinID;
          if (!gamef.getRoom(roomID).ingame) {
            gamef.getRoom(roomID).deletePlayerByID(userID);
            gamef.setUserRoom(playerJoinID, undefined);
            bot.say(playerJoinID, '```\nBạn đã bị kick ra khỏi phòng chơi do đã AFK quá lâu!\n```');
            roomChatAll(roomID, playerJoinID, `\`\`\`\n${player.first_name} đã bị kick ra khỏi phòng chơi do đã AFK quá lâu!\n\`\`\``);
          } else {
            gamef.getRoom(roomID).killAction(player.id);
            leaveRole = player.role;
            bot.say(playerJoinID, '```\nBạn đã bị ADMIN sát hại do đã AFK quá lâu!\n```');
            roomChatAll(roomID, playerJoinID, `\`\`\`\n${player.first_name} đã bị ADMIN sát hại (do AFK quá lâu) với vai trò là: ${leaveRole == -1 ? '🐺SÓI' : leaveRole == 1 ? '🔍TIÊN TRI' : leaveRole == 2 ? '🗿BẢO VỆ' : leaveRole == 3 ? '🔫THỢ SĂN' : '💩DÂN THƯỜNG'}\n\`\`\``);
            gamef.getRoom(roomID).newLog(`\`\`\`\n${user.first_name} đã bị ADMIN sát hại (do AFK quá lâu) với vai trò là: ${leaveRole == -1 ? '🐺SÓI' : leaveRole == 1 ? '🔍TIÊN TRI' : leaveRole == 2 ? '🗿BẢO VỆ' : leaveRole == 3 ? '🔫THỢ SĂN' : '💩DÂN THƯỜNG'}\n\`\`\``);
            if (gamef.getRoom(roomID).isNight) {
              gamef.getRoom(roomID).roleIsDone((isDone) => {
                if (isDone) {
                  nightDoneCheck(roomID);
                }
              });
            } else if (gamef.getRoom(roomID).isMorning) {
              gamef.getRoom(roomID).roleIsDone((isDone) => {
                if (isDone) {
                  dayVoteEnd(roomID);
                }
              });
            } else {
              gamef.getRoom(roomID).roleIsDone((isDone) => {
                if (isDone) {
                  yesNoVoteCheck(roomID);
                }
              });
            }
          }
          convo.say('Thành công!');
          convo.end();
          console.log(`$ ROOM ${roomID} > KICK PLAYER ${player.first_name}`);
        } else {
          convo.say(`Bạn đã hủy không thực hiện lệnh nào!`)
          convo.end();
        }
      }
    });
  };

  if (['2643770348982136', '2023444534356078', '2283562135018064'].indexOf(joinID) != -1) {
    console.log(`ADMIN ${joinID} (2643: DUY, 2023: LINH, 2283: TRƯỜNG)!`);
    chat.conversation((convo) => {
      askCMD(convo);
    });
  } else {
    chat.say('```\nBạn không có quyền thực hiện yêu cầu này!\n```');
  }
});

bot.start(process.env.PORT || 3000);
