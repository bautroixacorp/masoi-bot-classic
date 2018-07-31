const { asyncForEach, roomChatAll } = require('../Chat/Utils');
const roomRoleChat = require('../Night/roomRoleChat');

module.exports = (gamef, bot) => {
    const readyCallback = (payload, chat) => {
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
                    gamef.gameIsReady(userRoom, async (gameReady) => {
                        if (gameReady && !gamef.getRoom(userRoom).ingame) {
                            console.log(`$ ROOM ${userRoom + 1} > GAME_START`);
                            gamef.getRoom(userRoom).setInGame();
                            let roleListTxt = gamef.roleRandom(userRoom);
                            await roomChatAll(bot, gamef.getRoom(userRoom).players, 0, [`Tất cả mọi người đã sẵn sàng! Game sẽ bắt đầu...`, roleListTxt]);
                            gamef.getRoom(userRoom).dayNightSwitch();
                            await roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛`);
                            gamef.getRoom(userRoom).newLog(`🌛Đêm thứ ${gamef.getRoom(userRoom).day}🌛++++++++++`);
                            // await roomRoleChat(userRoom);
                            gamef.func(roomRoleChat, bot, userRoom);
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
    };
    //listen for READY
    bot.on('postback:READY_ROOM', readyCallback);
    bot.hear(/\/ready/i, readyCallback);
};
