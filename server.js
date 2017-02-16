var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();

app.use(bodyParser.json());

var applicationId = fs.readFileSync('application-id').toString().trim();

var utterancesPre = JSON.parse(fs.readFileSync('utterances.json').toString());

var utterances = {};
for (var k in utterancesPre.utterances) {
	utterances[k.toLowerCase()] = utterancesPre.utterances[k];
}

var songClasses = JSON.parse(fs.readFileSync('song-classes.json').toString());

var plainTextObject = function (text, endSession) {
	return {
		"version": "1.0",
		"response": {
			"outputSpeech": {
				"type": "PlainText",
				"text": text
			},
			"shouldEndSession": endSession
		}
	};
};

var songObject = function (songName) {
	return {
	  "version": "1.0",
	  "response": {
	    "outputSpeech": {
	      "type": "PlainText",
	      "text": "Here's " + songName
	    },
	    "shouldEndSession": true
	  },
	  "directives": [
	    {
	      "type": "AudioPlayer.Play",
	      "playBehavior": "REPLACE_ALL",
	      "audioItem": {
	        "stream": {
	          "url": "https://taylor-recommender.syntaxblitz.net/-obfuscated-/" + songName + ".mp3",
	          "token": "current-taylor",
	          "offsetInMilliseconds": 0
	        }
	      }
	    }
	  ]
	}; 
}

var randomPrompt = function () {
	var responses = [
		'What\'s up in your life?',
		'How are you feeling?',
		'What\'s happening?'
	];

	return responses[Math.floor(Math.random() * responses.length)];
};

app.post('/', function (req, res) {
	console.log(JSON.stringify(req.body));
	
	if (req.body.session.application.applicationId !== applicationId) {
		res.status(400).send();
	} else {
		handleRequest(req.body, res);
	}
});

var handleRequest = function (json, res) {
	if (json.request.type === 'LaunchRequest') {
		res.status(200).json(plainTextObject(randomPrompt(), false));	
	} else if (json.request.type === 'IntentRequest') {
		var songCategory = getCategory(json.request.intent.slots.Situation.value);
		if (songCategory === null) {
			res.status(200).json(plainTextObject('I don\'t know how to help you there.', true));
			return;
		}

		console.log(songCategory);

		var potentialSongs = songClasses[songCategory];
		var songName = potentialSongs[Math.floor(Math.random() * potentialSongs.length)];
		console.log(songName);
		var songObj = songObject(songName);
		console.log(JSON.stringify(songObj));
		res.status(200).json(songObj);
	} else {
	}
};

var getCategory = function (text) {
	// the prompts are written from the perspective of someone who's into women
	text = text.replace(/boy/g, 'girl');
	text = text.replace(/him/g, 'her');
	text = text.replace(/ he/g, ' she');

	if (text in utterances) {
		console.log('requested ' + text);
		var potentialCategoriesObject = utterances[text];
		var potentialCategories = [];
		var categorySum = 0;
		for (var k in potentialCategoriesObject) {
			if (potentialCategoriesObject[k] >= 0.7) {
				var toPush = [];
				toPush[0] = k;
				toPush[1] = potentialCategoriesObject[k];
				potentialCategories.push(toPush);
				categorySum += potentialCategoriesObject[k];
			}
		}

		// none was >.7, idk if this happens
		if (potentialCategories.length === 0) return potentialCategories[0][0];

		var categoryChoice = Math.random() * categorySum;
		var runningSum = 0;
		for (var i = 0; i < potentialCategories.length; i++) {
			runningSum += potentialCategories[i][1];
			if (runningSum >= categoryChoice) {
				return potentialCategories[i][0];
			}
		}

		return potentialCategories[potentialCategories.length - 1][0]; // rounding error
	} else {
		console.log('didn\'t understand ' + text);
		return null;
	}
};

app.listen(6443, function () {
	console.log('Listening on 6443');
});
