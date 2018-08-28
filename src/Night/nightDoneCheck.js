const dayNotify = require('../Night/dayNotify');
const { roomChatAll } = require('../Chat/Utils');

function callWitch(gamef, bot, userRoom, deathID, deathTxt, thereIsOneDied) {
    const askForSaveKill = (convo, askTxt = `CALL phù thủy improper way`, qreply, witchSave) => {
        convo.ask({
            text: askTxt,
            quickReplies: qreply,
        }, async (payload, convo) => {
            if (!payload.message || !(/(y|Y)es/g.test(payload.message.text) || /(n|N)o/g.test(payload.message.text) || /skip/g.test(payload.message.text) || /\/kill\s[0-9]+/g.test(payload.message.text) || /^\/evote$/.test(payload.message.text) || /[0-9]+:.+/g.test(payload.message.text))) {
                convo.say(`\`\`\`\nKhông hợp lệ!\n\`\`\``);
                askForSaveKill(convo, askTxt, qreply, witchSave);
                return;
            } else {
                if (/(y|Y)es/g.test(payload.message.text) || /(n|N)o/g.test(payload.message.text)) {
                    if (gamef.getRoom(userRoom).witchSaveRemain) { // còn quyền cứu
                        let witchSaved = false;
                        if (/(y|Y)es/g.test(payload.message.text)) { // cứu
                            witchSaved = true;
                            gamef.getRoom(userRoom).witchUseSave();
                            await convo.say(`✔ Bạn đã cứu *${deathTxt}*!`);
                            console.log(`$ ROOM ${userRoom + 1} > WITCH SAVE OK`);
                            gamef.getRoom(userRoom).newLog(`🔮Phù thủy *${gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).witchID).first_name}* đã cứu *${deathTxt}*!`);
                        }
                        // còn quyền giết
                        if (gamef.getRoom(userRoom).witchKillRemain) {
                            let playerListTxt = gamef.getRoom(userRoom).playersTxt.join(' / ');
                            askForSaveKill(convo, `🔮Để dùng quyền giết:\n"/kill <số id>"\n${playerListTxt}\n🔮Nếu không giết ai: "/skip"`, ["/evote", "/skip"], witchSaved);
                        } else {
                            gamef.getRoom(userRoom).cancelSchedule();
                            convo.end();
                            dayNotify(gamef, bot, userRoom, witchSaved);
                        }
                    } else {
                        convo.say('```\nBạn đã hết quyền cứu\n```');
                    }
                } else { // kill hoặc skip
                    if (gamef.getRoom(userRoom).witchKillRemain) {
                        if (/^\/evote$/.test(payload.message.text)) {
                            let playerList = gamef.getRoom(userRoom).getAlivePlayerList();
                            // convo.say(`Tính năng này chưa sẵn sàng vui lòng gõ lệnh /kill <id> hoặc /skip`);
                            askForSaveKill(convo, `Bạn muốn giết ai?`, playerList, witchSave);
                            return;
                        }
                        if (/\/kill\s[0-9]+/g.test(payload.message.text) || /[0-9]+:.+/g.test(payload.message.text)) {  //kill
                            let voteID = payload.message.text.match(/[0-9]+/g)[0];
                            if (!gamef.getRoom(userRoom).witchKillVote(voteID)) {
                                convo.say(`\`\`\`\nBạn không thể giết người đã chết!\n\`\`\``);
                                askForSaveKill(convo, askTxt, qreply, witchSave);
                                return;
                            } else {
                                let witchKillName = gamef.getRoom(userRoom).playersTxt[voteID];
                                // console.log(`$ ROOM ${userRoom + 1} > WITCH KILL: ${witchKillName}`);
                                // gamef.getRoom(userRoom).newLog(`⛔Phù thủy ${gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).witchID).first_name} đã giết ${witchKillName}!`)
                                await convo.say(`⛔Bạn đã giết ${witchKillName}!`);
                            }
                        }
                        gamef.getRoom(userRoom).cancelSchedule();
                        convo.end();
                        dayNotify(gamef, bot, userRoom, witchSave);
                    } else {
                        convo.say('```\nBạn đã hết quyền giết\n```');
                    }
                }
            }
        });
    };
    //Call phù thủy khi: còn phù thủy
    if (gamef.getRoom(userRoom).witchID != undefined) {
        bot.conversation(gamef.getRoom(userRoom).witchID, async (convo) => {
            let time = undefined;
            if (gamef.getRoom(userRoom).witchSaveRemain || gamef.getRoom(userRoom).witchKillRemain) {
                if (thereIsOneDied) {
                    await convo.say(`\`\`\`\n👻 *${deathTxt}* đã CHẾT!\n⏰ Bạn có 60 giây\n\`\`\``);
                    time = new Date(Date.now() + 60 * 1000);
                } else if (gamef.getRoom(userRoom).witchKillRemain) {
                    await convo.say(`\`\`\`\n😇 Đêm qua không ai chết!\n⏰ Bạn có 45 giây\n\`\`\``);
                    time = new Date(Date.now() + 45 * 1000);
                }
                if (time) {
                    gamef.getRoom(userRoom).addSchedule(time, () => {
                        console.log(`$ ROOM ${userRoom + 1} > AUTO ROLE > WITCH`);
                        convo.say(`⏰ Bạn đã ngủ quên (-40 uy tín)!`);
                        let witchUser = gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).witchID);
                        witchUser ? witchUser.afk(4) : null;
                        convo.end();
                        dayNotify(gamef, bot, userRoom, false);
                    });
                }

                if (thereIsOneDied && gamef.getRoom(userRoom).witchSaveRemain && gamef.getRoom(userRoom).witchKillID != deathID) {
                    askForSaveKill(convo, `🔮Bạn có cứu ${deathTxt}* không?\n"/yes" hay "/no" ?`, ["/yes", "/no"]);
                } else if (gamef.getRoom(userRoom).witchKillRemain) {
                    let playerListTxt = gamef.getRoom(userRoom).playersTxt.join(' / ');
                    askForSaveKill(convo, `🔮Để dùng quyền giết:\n"/kill <số id>"\n${playerListTxt}\n🔮Nếu không giết ai: "/skip"`, ["/skip"], false);
                } else { // không còn quyền giết và không ai chết
                    // gamef.getRoom(userRoom).cancelSchedule();
                    convo.end();
                    dayNotify(gamef, bot, userRoom, false);
                }
            } else { // hết quyền
                convo.end();
                dayNotify(gamef, bot, userRoom, false);
            }
        });
    } else { // không có phù thủy
        dayNotify(gamef, bot, userRoom, false);
    }
}

module.exports = (gamef, bot, userRoom) => {
    gamef.getRoom(userRoom).roleIsDone((isDone) => {
        if (isDone) {
            gamef.getRoom(userRoom).findOutDeathID();
            let deathID = gamef.getRoom(userRoom).deathID;
            let deathTxt;
            if (deathID != -1) {
                deathTxt = gamef.getRoom(userRoom).playersTxt[deathID];
            }

            const askForNguyen = (convo) => {
                convo.ask({
                    text: `\`\`\`\n👻 *${deathTxt}* đã CHẾT!\n⏰ Bạn có 30 giây để nguyền hay không?\n("/yes" hay "/no)\n\`\`\``,
                    quickReplies: ['/yes', '/no'],
                }, async (payload, convo) => {
                    if (!payload.message || !(/(y|Y)es/g.test(payload.message.text) || /(n|N)o/g.test(payload.message.text))) {
                        convo.say(`\`\`\`\nKhông hợp lệ!\n\`\`\``);
                        askForNguyen(convo);
                        return;
                    } else {
                        gamef.getRoom(userRoom).cancelSchedule();
                        if (/(y|Y)es/g.test(payload.message.text)) { // nguyền, trời sáng luôn
                            gamef.getRoom(userRoom).nguyen(deathID);
                            convo.say(`✔ Bạn đã nguyền thành công!`);
                            convo.end();
                            dayNotify(gamef, bot, userRoom, false);
                        } else { // không nguyền, hỏi phù thủy cứu
                            convo.end();
                            callWitch(gamef, bot, userRoom, deathID, deathTxt, true);
                        }
                    }
                });
            };

            // kiểm tra có người chết không?
            let thereIsOneDied = false;
            if (deathID != -1 && gamef.getRoom(userRoom).players[deathID] && gamef.getRoom(userRoom).players[deathID].role != -2 && gamef.getRoom(userRoom).players[deathID].role != 6 && deathID != gamef.getRoom(userRoom).saveID) {
                thereIsOneDied = true;
            }
            //Call sói nguyền
            if (thereIsOneDied && gamef.getRoom(userRoom).soiNguyen && gamef.getRoom(userRoom).soiNguyenID != undefined) {
                bot.conversation(gamef.getRoom(userRoom).soiNguyenID, async (convo) => {
                    let time = new Date(Date.now() + 30 * 1000);
                    gamef.getRoom(userRoom).addSchedule(time, () => {
                        console.log(`$ ROOM ${userRoom + 1} > AUTO ROLE > SÓI NGUYỀN`);
                        convo.say(`⏰ Bạn chưa quyết định nguyền hay không (-30 uy tín)!`);
                        let soiNguyenUser = gamef.getRoom(userRoom).getPlayer(gamef.getRoom(userRoom).soiNguyenID);
                        soiNguyenUser ? soiNguyenUser.afk(3) : null;
                        convo.end();
                        callWitch(gamef, bot, userRoom, deathID, deathTxt, true);
                    });
                    askForNguyen(convo);
                });
            } else {
                callWitch(gamef, bot, userRoom, deathID, deathTxt, thereIsOneDied);
            }
        }
    });
}