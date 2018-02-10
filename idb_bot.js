const config = require('./cfg/config');
const qs = require('querystring');
const request = require('request');
const schedule = require('node-schedule');
const stringSearcher = require('string-search');

const Q = require('q');

/*******************************************
** TASK SCHEDULE setup
*******************************************/

var taskSchedule = new schedule.RecurrenceRule();
taskSchedule.minute = 40;
taskSchedule.hour = 17;


/*******************************************
** DISCORD setup
*******************************************/

const Discord = require("discord.js");
const client = new Discord.Client();
const token = config.discord.token;

// Set the prefix
const prefix = ".";


/*******************************************
** EVE setup
*******************************************/

const client_id = config.eve.client_id;
const client_secret = config.eve.client_secret;
const ESI_URL = config.eve.url;
const DATASOURCE = config.eve.datasource;


/*******************************************
** MYSQL setup
*******************************************/
const mysql = require('mysql');
var connection = mysql.createConnection({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
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


/*******************************************
** DISCORD
*******************************************/

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setPresence({ game: { name: 'with BPOs', type: 0 } });
});

client.on("message", (message) => {
	if(message.author.bot) return;
	if(message.content.indexOf(prefix) !== 0) return;

	const args = message.content.slice(prefix.length).trim().toLowerCase().split(/ +/g);
	const command = args.shift().toLowerCase();

    /*
        aniles 122341111460003840
        infy 150742643486228480
	if(message.author.id !== '120982046817386499') {
		message.reply('Access denied!');
		return;
	}
    */

	if (command  === 'help') {
		message.channel.send('**Dir ist nicht zu helfen**');
	}

	if (command  === 'ping') {
        var now = new Date();
        message.author.send('Replying at ' + now);
        message.channel.send('**I have send you a DM.**');

	}

    if (command  === 'list') {
		Q.all([getActiveJobs('98068725'),getReadyJobs('98068725'),getNextJobs('98068725'),getReadyJobsCount('98068725'),getActiveJobsList('98068725')]).spread(function(active,ready,next,count,list) {
            var msg = '**Job list for <insert corporation>**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.';
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

    if (command  === 'info') {
        Q.all([getActiveJobs('98068725'),getReadyJobs('98068725'),getNextJobs('98068725')]).spread(function(active,ready,next) {
            var currentDate = new Date();
            var difference = next[0].end_date.getTime() - currentDate.getTime();
            var daysDifference = Math.floor(difference/1000/60/60/24);
            difference -= daysDifference*1000*60*60*24;
            var hoursDifference = Math.floor(difference/1000/60/60);
            difference -= hoursDifference*1000*60*60;
            var minutesDifference = Math.floor(difference/1000/60);
            difference -= minutesDifference*1000*60;
            var secondsDifference = Math.floor(difference/1000);

            message.reply('**Daily Industry Report**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
        }).done();
    }

	if (command === 'test') {
		var oo = message.author;
        message.channel.send(oo);
	}

});

function start() {
    Q.all([getActiveJobs('98068725'),getReadyJobs('98068725'),getNextJobs('98068725')]).spread(function(active,ready,next) {
        var currentDate = new Date();
        var difference = next[0].end_date.getTime() - currentDate.getTime();
        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24;
        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60;
        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60;
        var secondsDifference = Math.floor(difference/1000);

        client.channels.get('122175912983658500').send('<@120982046817386499> **Daily Industry Report**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
    }).done();
	//console.log('executed scheduled job');
}


schedule.scheduleJob(taskSchedule, start);
//console.log('The schdule has been initialzed');

client.login(token);
