const { roomChatAll } = require('../Chat/Utils');
const gameIsNotEndCheck = require('../MainGame/gameIsNotEndCheck');

module.exports = async (gamef, bot, userRoom, witchSaved) => {
    let deathID = gamef.getRoom(userRoom).deathID;
    let deathTxt, deathRole;
    if (deathID != -1) {
        deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
        deathRole = gamef.roleTxt[gamef.getRoom(userRoom).getRoleByID(deathID)];
    }
    let dieCount = 0;

    let chatAllTxt = `🌞Trời sáng rồi mọi người dậy đi\n`;
    
    // SÓI CẮN
    if (!witchSaved && gamef.getRoom(userRoom).kill()) {
        dieCount++;
        chatAllTxt += `🔪 *${deathTxt}* đã CHẾT!`;
        gamef.getRoom(userRoom).newLog(`🔪 *${deathTxt}* là ${deathRole} đã bị SÓI cắn!`);
        console.log(`$ ROOM ${userRoom + 1} > ${deathTxt} DIED!`);
        if (gamef.getRoom(userRoom).players[deathID].role === 3) { //người chết là thợ săn
            dieCount++;
            let fireID = gamef.getRoom(userRoom).fireID;
            let deathFireTxt = gamef.getRoom(userRoom).playersTxt[fireID];
            chatAllTxt += `🔪 *${deathFireTxt}* đã CHẾT!`;
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
            chatAllTxt += `🔪 *${deathByMagicTxt}* đã CHẾT!`;
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
        chatAllTxt += `🎊Đêm hôm qua không ai chết cả!`;
    }
    roomChatAll(bot, gamef.getRoom(userRoom).players, 0, chatAllTxt);
    

    gameIsNotEndCheck(gamef, bot, userRoom, () => {
        let playersInRoomTxt = gamef.getRoom(userRoom).playersTxt.join(' ; ');
        roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `⏰Mọi người có 6 phút thảo luận!`);
        gamef.getRoom(userRoom).dayNightSwitch();

        let time = new Date(Date.now() + 5 * 60 * 1000);
        gamef.getRoom(userRoom).addSchedule(time, () => {
            roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `⏰CÒN 1 PHÚT THẢO LUẬN\nCác bạn nên cân nhắc kĩ, tránh lan man, nhanh chóng tìm ra kẻ đáng nghi nhất!`);
            console.log(`$ ROOM ${userRoom + 1} > 1 MINUTE REMAINING`);
            let time = new Date(Date.now() + 1 * 60 * 1000);
            gamef.getRoom(userRoom).addSchedule(time, () => {
                roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `⏰Đã hết thời gian, mọi người vote một người để treo cổ!\n/vote <id> để treo cổ 1 người\n${playersInRoomTxt}`);
                gamef.getRoom(userRoom).chatOFF();
                console.log(`$ ROOM ${userRoom + 1} > END OF DISCUSSION!`);
            });
        });
    });
}