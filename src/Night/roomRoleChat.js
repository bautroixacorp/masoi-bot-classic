const { asyncForEach } = require('../Chat/Utils');
const nightDoneCheck = require('../Night/nightDoneCheck');
const { roomChatAll } = require('../Chat/Utils');

module.exports = async (gamef, bot, userRoom) => {

    // đếm giờ ban đêm
    gamef.getRoom(userRoom).players.forEach((p, index, players) => {
        if (p.role == -2 || p.role == 4 || p.role == 6) {
            return;
        }
        if (p.role == -1) { // SÓI có 1 phút 30 giây
            let time = new Date(Date.now() + 60 * 1000);
            players[index].addSchedule(time, () => {
                roomChatAll(bot, gamef.getRoom(userRoom).players, 0, `\`\`\`\n⏰Trời sắp sáng rồi! Còn 30 giây...\n\`\`\``);
                console.log(`$ ROOM ${userRoom + 1} > WOLFS > 30 SECONDS REMAINING`);
                let time = new Date(Date.now() + 30 * 1000);
                players[index].addSchedule(time, () => {
                    console.log(`$ ROOM ${userRoom + 1} > WOLFS > AUTO MORNING!`);
                    gamef.getRoom(userRoom).autoRole(p.joinID);
                    gamef.func(nightDoneCheck, bot, userRoom);
                });
            });
        } else {
            let time;
            if (p.role == 7) { // CUPID có 30 giây
                time = new Date(Date.now() + 15 * 1000);
            } else { // còn lại: Tiên tri, bảo vệ, thợ săn, phù thủy có 60 giây
                time = new Date(Date.now() + 45 * 1000);
            }
            players[index].addSchedule(time, () => {
                bot.say(p.joinID, `\`\`\`\n⏰Bạn còn 15 giây để thực hiện...\n\`\`\``);
                console.log(`$ ROOM ${userRoom + 1} > ${p.first_name} > 15 SECONDS REMAINING`);
                let time = new Date(Date.now() + 15 * 1000);
                players[index].addSchedule(time, () => {
                    bot.say(p.joinID, `⏰Đã hết thời gian! Bạn đã mất quyền năng đêm nay!`);
                    gamef.getRoom(userRoom).autoRole(p.joinID);
                    console.log(`$ ROOM ${userRoom + 1} > ${p.first_name} > AUTO ROLE ${p.role}`);
                    gamef.func(nightDoneCheck, bot, userRoom);
                });
            });
        }
    });

    await asyncForEach(gamef.getRoom(userRoom).players, (p) => {
        if (p && gamef.getRoom(userRoom).alivePlayer[p.joinID]) {
            console.log(`$ ROOM ${userRoom + 1} > ${gamef.roleTxt[p.role]} > ${p.first_name}`);
            let wolfList = gamef.getRoom(userRoom).wolfsTxt.join(' ; ');
            let villagersList = gamef.getRoom(userRoom).villagersTxt.join(' ; ');
            let playersList = gamef.getRoom(userRoom).playersTxt.join(' ; ');
            let isCupidTxt = ``;

            if (gamef.getRoom(userRoom).cupidsID.indexOf(p.joinID) != -1) {
                if (gamef.getRoom(userRoom).cupidTeam) {
                    isCupidTxt += `👼Bạn thuộc PHE CẶP ĐÔI (thứ 3)!\n👼Bảo vệ tình yêu của mình và tiêu diệt các người chơi khác để dành chiến thắng!\n`;
                }
                isCupidTxt += `💞ID CẶP ĐÔI:\n${gamef.getRoom(userRoom).cupidsTxt.join(' ; ')}\n\n`;
            }

            if (p.role == -1) {//SÓI
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/masoi.jpg'
                }, isCupidTxt + `🐺Sói ơi dậy đi! Đêm nay sói muốn cắn ai?\n/vote <id> để cắn 1 ai đó\n👨‍👩‍👦‍👦ID CẢ LÀNG:\n${playersList}\n🐺ID TEAM SÓI:\n${wolfList}\n💩ID TEAM DÂN:\n${villagersList}`]);
            } else if (p.role == 1) { // tiên tri
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/11-18/tien-tri.jpg'
                }, isCupidTxt + `🔍Tiên tri dậy đi! Tiên tri muốn kiểm tra ai?\n/see <id> để kiểm tra\n${playersList}`]);
            } else if (p.role == 2) { // Bảo vệ
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/baove.jpg'
                }, isCupidTxt + `🗿Bảo vệ dậy đi! Đêm nay bạn muốn bảo vệ ai?\n/save <id> để bảo vệ\n${playersList}`]);
            } else if (p.role == 3) { // Thợ săn
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/thosan.jpg'
                }, isCupidTxt + `🔫Thợ săn dậy đi! Đêm nay bạn muốn bắn ai?\n/fire <id> để ngắm bắn\n${playersList}`]);
            } else if (p.role == -2) { // Bán sói
                gamef.getRoom(userRoom).roleDoneBy(p.joinID);
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/phanboi.jpg'
                }, isCupidTxt + `🐺Bạn là BÁN SÓI!\nBạn vẫn còn là DÂN! Ngủ tiếp đi!\nID CẢ LÀNG:\n${playersList}`]);
            } else if (p.role == 5) { // Phù thủy
                let sayTxt;
                if (gamef.getRoom(userRoom).witchKillRemain) {
                    sayTxt = `🔮Bạn là Phù thủy!\n${gamef.getRoom(userRoom).witchSaveRemain ? '☑Bạn còn quyền cứu' : '⛔Bạn đã dùng quyền cứu!'}\n☑/kill <id> để giết\n☑/skip để bỏ qua\n${playersList}`;
                } else {
                    sayTxt = `🔮Bạn là Phù thủy!\n${gamef.getRoom(userRoom).witchSaveRemain ? '☑Bạn còn quyền cứu' : '⛔Bạn đã dùng quyền cứu!'}\n⛔Bạn đã dùng quyền giết!\n${playersList}`;
                    gamef.getRoom(userRoom).roleDoneBy(p.joinID);
                }
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/phuthuy.jpg'
                }, isCupidTxt + sayTxt]);
            } else if (p.role == 6) { // GIÀ LÀNG
                gamef.getRoom(userRoom).roleDoneBy(p.joinID);
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/gialang.jpg'
                }, isCupidTxt + `👴Bạn là Già làng! Bảo trọng =))\n👨‍👩‍👦‍👦ID CẢ LÀNG:\n${playersList}`]);
            } else if (p.role == 7) { // THẦN TÌNH YÊU
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/cupid.jpg'
                }, isCupidTxt + `👼Bạn là THẦN TÌNH YÊU!\n/cupid <id1> <id2> để ghép đôi\n${playersList}`]);
            } else { // DÂN
                gamef.getRoom(userRoom).roleDoneBy(p.joinID);
                return bot.say(p.joinID, [{
                    attachment: 'image',
                    url: 'http://hstatic.net/936/1000019936/10/2015/7-28/danlang.jpg'
                }, isCupidTxt + `💩Bạn là DÂN! Ngủ tiếp đi :))\n👨‍👩‍👦‍👦ID CẢ LÀNG:\n${playersList}`]);
            }
        } else {
            return bot.say(p.joinID, "Đêm nay bạn đã chết =))");
        }
    })
}