const { roomChatAll } = require('../Chat/Utils');
const roomRoleChat = require('../Night/roomRoleChat');
const gameIsNotEndCheck = require('../MainGame/gameIsNotEndCheck');
const yesNoVoteCheck = require('../Day/yesNoVoteCheck');
const DBTask = require('../DBModule/DBTask');

// module này thực hiện khi vote xong!
module.exports = (gamef, bot, userRoom) => {
  gamef.getRoom(userRoom).roleIsDone(async (isDone) => {
    gamef.getRoom(userRoom).findOutDeathID();
    gamef.getRoom(userRoom).cancelSchedule();
    let deathID = gamef.getRoom(userRoom).deathID;
    if (deathID != -1 && gamef.getRoom(userRoom).players[deathID] && gamef.getRoom(userRoom).alivePlayer[gamef.getRoom(userRoom).players[deathID].joinID]) { // mời 1 người lên giá treo cổ
      gamef.getRoom(userRoom).afternoonSwitch();
      let deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
      gamef.getRoom(userRoom).chatOFF();

      let userData = await DBTask(`SELECT * FROM USERDATA WHERE joinID = '${gamef.getRoom(userRoom).players[deathID].joinID}';`);
      let user = userData[0];
      let beWolf = user.bewolf;
      let beVillager = user.bevillager;
      let beThirdParty = user.bethirdparty;

      let sum = (beWolf + beVillager + beThirdParty);
      let wolfPercent = (sum != 0 ? Math.floor(beWolf * 100 / sum) : 0);

      console.log(">>>INFO: ", beWolf, beVillager, beThirdParty);
      roomChatAll(bot, gamef.getRoom(userRoom).players, 0, {
        cards: [
          {
            title: `Xin mời ${deathTxt} bước lên giá treo cổ!`,
            image_url: gamef.getRoom(userRoom).players[deathID].avatar,
            subtitle: `💡Thống kê cho thấy ${deathTxt} có ${wolfPercent}%  là SÓI!\n⏳Bạn có 1 phút để trăn trối`
          }
        ]
      });
      // 1 phút trăn trối
      let time = new Date(Date.now() + 1 * 60 * 1000);
      gamef.getRoom(userRoom).addSchedule(time, () => {
        // hết giờ, vote treo cổ nào!
        roomChatAll(bot, gamef.getRoom(userRoom).players, 0, {
          text: `\`\`\`\n⌛️Hết giờ! Mọi người có 30 giây!\n👎TREO CỔ hay 👍THA?\n"/treo" hoặc "/tha"\n\`\`\``,
          quickReplies: ['/treo', '/tha']
        });
        console.log(`$ ROOM ${userRoom + 1} > END OF TRĂN TRỐI :))`);
        // timer để vote treo cổ
        gamef.getRoom(userRoom).players.forEach((p, index, players) => {
          if (p && gamef.getRoom(userRoom).alivePlayer[p.joinID] && !gamef.getRoom(userRoom).roleDone[p.joinID]) {
            let time = new Date(Date.now() + 30 * 1000);
            players[index].addSchedule(time, async () => {
              roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `*ℹ️ ${p.first_name} đã không kịp vote* (-10 uy tín)`);
              gamef.getRoom(userRoom).roleDoneBy(p.joinID, true);
              gamef.func(yesNoVoteCheck, bot, userRoom);
            });
          }
        });
      });
    } else {
      gamef.getRoom(userRoom).newLog(`ℹ️ Ngày hôm đó không một ai bị treo cổ!`);
      roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `\`\`\`\n🔔Không một ai bị treo cổ\n🔔Mọi người đi ngủ\n\`\`\``);
      gameIsNotEndCheck(gamef, bot, userRoom, async () => {
        // Đêm tiếp theo
        gamef.getRoom(userRoom).dayNightSwitch();
        gamef.getRoom(userRoom).newLog(`\n🌛Đêm thứ ${gamef.getRoom(userRoom).day}\n`);
        roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `\n🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛\n`);
        gamef.func(roomRoleChat, bot, userRoom);
      });
    }
  });
}