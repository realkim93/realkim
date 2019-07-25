var schedule = require('node-schedule');
const { RTMClient, WebClient } = require('@slack/client');
var weather = require('weather-js');
const token = 'xoxb-16432736007-692688547314-8MW3yetfNmesWIw2xvqLP0y2';

const rtm = new RTMClient(token);
const web = new WebClient(token);
rtm.start();

var sendMessage = function(text, ch) {
	if (Array.isArray(ch)) {
		for (var i = 0; i < ch.length; i++) {
			rtm.sendMessage(text, ch[i])
				.then((msg) => console.log(`Message sent to channel ${ch}`))
				.catch(console.error);
		}
	}else {
		rtm.sendMessage(text, ch)
				.then((msg) => console.log(`Message sent to channel ${ch}`))
				.catch(console.error);
	}
}

var sendWeatherMessage = function(location, channel){
	weather.find({search: location, degreeType: 'C'}, function(err, result) {
		if(err) {
			console.log(err);
			sendMessage('에러! '+err, channel);
			return;
		}
		if (!result.length) {
			sendMessage('정보가 없습니다.', channel);
			return;
		}

		var now = new Date();
		var tz = now.getTime() + (now.getTimezoneOffset() * 60000) + (9 * 3600000);
		now.setTime(tz);

		var weekToday = now.toLocaleString('en-us', { weekday: 'short' });
		var weekTommorow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleString('en-us', { weekday: 'short' });
		var forecastToday = { low:'', high:'', skytextday:''};
		var forecastTomorrow = { low:'', high:'', skytextday:''};
		for (var i = 0; i < result[0].forecast.length; i++) {
			if (result[0].forecast[i].shortday == weekToday) {
				forecastToday = result[0].forecast[i];
			}else if (result[0].forecast[i].shortday == weekTommorow) {
				forecastTomorrow = result[0].forecast[i];
			}
		}

var text = result[0].location.name+'을 기반으로 한 정보입니다.\n\
현재 기온: '+result[0].current.temperature+'\'C, '+result[0].current.skytext+'\n\
오늘예상: '+forecastToday.skytextday+', 최저 '+forecastToday.low +'\'C, 최고 '+forecastToday.high+'\'C\n\
내일예상: '+forecastToday.skytextday+', 최저 '+forecastTomorrow.low +'\'C, 최고 '+forecastTomorrow.high+'\'C\n';
		sendMessage(text, channel);
	});
};

rtm.on('message', (message) => {
	if (message.subtype || (!message.subtype && message.user === rtm.activeUserId)) {
		return;
	}
	console.log(message);
	// Log the message
	console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
	if (message.text.includes('!날씨 ')) {
		var location = message.text.split('!날씨 ')[1];
		if (!location.length) {
			return;
		}
		sendWeatherMessage(location, message.channel);
	}
});
var scheduleRule = new schedule.RecurrenceRule();
scheduleRule.hour = 21;
scheduleRule.minute = 0;
var scheduleJob = schedule.scheduleJob(scheduleRule, function(){
	console.log('scheduleJob');
	web.channels.list().then((res) => {
	  // Take any channel for which the bot is a member
	  var channels = [];
	  for (var i = 0; i < res.channels.length; i++) {
		  if (res.channels[i].is_member) {
			  channels.push(res.channels[i].id);
		  }
	  }
	  if (!channels) {
		  console.log('가입된 채널이 없습니다.');
		  return;
	  }
	  sendWeatherMessage('Seoul', channels);
  });
});
