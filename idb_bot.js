const CONFIG = require('./cfg/config');
const QS = require('querystring');
const REQUEST = require('request');
const SCHEDULE = require('node-schedule');

const Q = require('q');

/*******************************************
** TASK SCHEDULE setup
*******************************************/

var taskSchedule = new SCHEDULE.RecurrenceRule();
taskSchedule.minute = 0;
taskSchedule.hour = 16;


/*******************************************
** DISCORD setup
*******************************************/

const DISCORD = require("discord.js");
const CLIENT = new DISCORD.Client();
const TOKEN = CONFIG.discord.token;

// Set the prefix
const PREFIX = ".";


/*******************************************
** EVE setup
*******************************************/

const CLIENT_ID = CONFIG.eve.client_id;
const CLIENT_SECRET = CONFIG.eve.client_secret;
const ESI_URL = CONFIG.eve.url;
const DATASOURCE = CONFIG.eve.datasource;


/*******************************************
** MYSQL setup
*******************************************/
const MYSQL = require('mysql');
var connection = MYSQL.createConnection({
    host     : CONFIG.mysql.host,
    user     : CONFIG.mysql.user,
    password : CONFIG.mysql.password,
    database : CONFIG.mysql.database
});


/*******************************************
**  FUNCTIONS
*******************************************/

function getActiveJobs(corp) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status=? AND eveJobs.corporationID=?';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getReadyJobs(corp) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date < now() AND eveJobs.status=? AND eveJobs.corporationID=?';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getNextJobs(corp) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status = ? AND eveJobs.corporationID=? ORDER BY eveJobs.end_date';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getReadyJobsCount(corp) {
    var deferred = Q.defer();

    var sql_query = 'SELECT COUNT(eveJobs.job_id) AS jobCount, eveJobs.installer_id, eveJobs.characterName FROM eveJobs WHERE eveJobs.end_date < now() AND eveJobs.status=? AND eveJobs.corporationID=? GROUP BY eveJobs.installer_id ORDER BY COUNT(eveJobs.job_id) DESC';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getActiveJobsList(corp) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status = ? AND eveJobs.corporationID=? ORDER BY eveJobs.end_date';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getUser(discordUser) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM users WHERE users.discordID=?';
    var query = connection.query(sql_query, [discordUser], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

function getCorpName(corporationID) {
    var deferred = Q.defer();

    var sql_query = 'SELECT * FROM corporations WHERE corporations.corporationID=?';
    var query = connection.query(sql_query, [corporationID], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}


/*******************************************
** DISCORD
*******************************************/

CLIENT.on("ready", () => {
    console.log(`Bot has started, with ${CLIENT.users.size} users, in ${CLIENT.channels.size} channels of ${CLIENT.guilds.size} guilds.`);
    CLIENT.user.setPresence({ game: { name: 'with BPOs', type: 0 } });
});

CLIENT.on("message", (message) => {
	if(message.author.bot) return;
	if(message.content.indexOf(PREFIX) !== 0) return;

	const ARGS = message.content.slice(PREFIX.length).trim().toLowerCase().split(/ +/g);
	const COMMAND = ARGS.shift().toLowerCase();

    /*
        aniles 122341111460003840
        infy 150742643486228480
	if(message.author.id !== '120982046817386499') {
		message.reply('Access denied!');
		return;
	}
    */

	if (COMMAND  === 'help') {
		message.channel.send('**Dir ist nicht zu helfen**');
	}

	if (COMMAND  === 'ping') {
        var now = new Date();
        message.author.send('Replying at ' + now);
        message.channel.send('**I have send you a DM.**');

	}

    if (COMMAND  === 'list') {
        Q.all([getUser(message.author.id)]).spread(function(user) {
            if (user.length != 0) {
                for(var i=0;i<user.length;i++) {
                    Q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getReadyJobsCount(user[i].corporationID),getActiveJobsList(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,count,list,corp) {
                        var msg = '**Job list for ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.';
                        if(count.length != 0) {
                            msg += ' *(';
                            for (var i = 0;i < count.length; i++) {
                                msg += ' ' + count[0].jobCount + ' - ' + count[0].characterName + ' ';
                            }
                            msg +=')*\n\n';
                        }
                        message.reply(msg);

                        var jobList = '**List of active jobs:**\n';

                        for(var i=0; i<list.length; i++) {
                            if((i != 0) && ((i%10) == 0)) {
                                //console.log(jobList);
                                message.reply(jobList);
                                jobList = '**List of active jobs:**\n';
                            }
                            var currentDate = new Date();
                            var difference = list[i].end_date.getTime() - currentDate.getTime();
                            var daysDifference = Math.floor(difference/1000/60/60/24);
                            difference -= daysDifference*1000*60*60*24;
                            var hoursDifference = Math.floor(difference/1000/60/60);
                            difference -= hoursDifference*1000*60*60;
                            var minutesDifference = Math.floor(difference/1000/60);
                            difference -= minutesDifference*1000*60;
                            var secondsDifference = Math.floor(difference/1000);

                            jobList += '**' + list[i].runs + '**x **' + list[i].typeName + '** on *' + list[i].characterName + '* finishes in **' + daysDifference + 'd-' + hoursDifference + 'h:' + minutesDifference + 'm:' + secondsDifference + 's**\n';

                        }

                        if((list.length%10) != 0) {
                            message.reply(jobList);
                        }

                    }).done();
                }
            } else {
                message.reply('I do not know you.');
            }
        }).done();
	}

    if (COMMAND  === 'info') {
        Q.all([getUser(message.author.id)]).spread(function(user) {
            if (user.length != 0) {
                for(var i=0;i<user.length;i++) {
                    Q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,corp) {
                        if (next.length != 0) {
                            var currentDate = new Date();
                            var difference = next[0].end_date.getTime() - currentDate.getTime();
                            var daysDifference = Math.floor(difference/1000/60/60/24);
                            difference -= daysDifference*1000*60*60*24;
                            var hoursDifference = Math.floor(difference/1000/60/60);
                            difference -= hoursDifference*1000*60*60;
                            var minutesDifference = Math.floor(difference/1000/60);
                            difference -= minutesDifference*1000*60;
                            var secondsDifference = Math.floor(difference/1000);

                            message.reply('**Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
                        }
                        else {
                            message.reply('**Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.');
                        }

                    }).done();
                }
            } else {
                message.reply('I do not know you.');
            }
        }).done();
    }

	if (COMMAND === 'rm') {
        if (ARGS.length != 4) {
            return message.channel.send(`Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*, ${message.author}!`);
        }

        var rm_d = parseInt(ARGS[0]);
        var rm_h = parseInt(ARGS[1]);
        var rm_m = parseInt(ARGS[2]);
        var rm_c = ARGS[3];

        if (isNaN(rm_d)) {
            return message.reply('1 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (isNaN(rm_h)) {
            return message.reply('2 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (rm_h < -1 || rm_h > 24 ) {
            return message.reply('3 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (isNaN(rm_m)) {
            return message.reply('4 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (rm_m < -1 || rm_m > 60 ) {
            return message.reply('5 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else {
            message.reply(rm_d + ' ' + rm_h + '' + rm_m + ' ' + rm_c);
        }

	}

});

function start() {
    var dmUser = CLIENT.users.get('120982046817386499');


    Q.all([getUser('120982046817386499')]).spread(function(user) {
        for(var i=0;i<user.length;i++) {
            Q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,corp) {
                if (next.length != 0) {
                    var currentDate = new Date();
                    var difference = next[0].end_date.getTime() - currentDate.getTime();
                    var daysDifference = Math.floor(difference/1000/60/60/24);
                    difference -= daysDifference*1000*60*60*24;
                    var hoursDifference = Math.floor(difference/1000/60/60);
                    difference -= hoursDifference*1000*60*60;
                    var minutesDifference = Math.floor(difference/1000/60);
                    difference -= minutesDifference*1000*60;
                    var secondsDifference = Math.floor(difference/1000);
                    dmUser.send('<@120982046817386499> **Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
                }
                else {
                    dmUser.send('<@120982046817386499> **Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.');
                }
            }).done();
        }
    }).done();
	//console.log('executed scheduled job');
}

function dm() {
    var duser = CLIENT.users.get('120982046817386499');
    duser.send('<content>');
}


SCHEDULE.scheduleJob(taskSchedule, start);
//console.log('The schdule has been initialzed');

CLIENT.login(TOKEN);
