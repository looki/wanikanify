// ==UserScript==
// @name        WaniKanify
// @namespace   wanikani
// @description Firefox version of chedkid's excellent Chrome app
// @include     *wanikani
// @version     1.0
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @require		http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// ==/UserScript==

window.addEventListener('load', function()
{
	var FORMAT_VER = 1;

	var API_KEY = GM_getValue("apiKey");

	if (API_KEY == undefined)
	{
		while (true)
		{
			API_KEY = window.prompt("Please enter your API key", "");

			if (API_KEY && !/^[a-fA-F0-9]{32}$/.test(API_KEY))
			{
				alert("That was not a valid API key, please try again");
			}
			else
			{
				break;
			}
		}

		if (API_KEY)
		{
			GM_setValue("apiKey", API_KEY);
		}
	}

	// Get the current timestamp (in minutes)
	var currentTime = Math.floor(new Date().getTime() / 60000);

	// Get the time and the vocab format from when the vocab list was last refreshed
	var refreshTime = GM_getValue("refreshTime");
	var refreshFormat = GM_getValue("formatVer");

	var needRefresh = (refreshFormat != FORMAT_VER) || (refreshTime == undefined) || (currentTime - refreshTime >= 300);

	// No refresh needed, simply replace vocab...
	if (!needRefresh)
	{
		replaceVocab(JSON.parse(GM_getValue("vocab")));
	}
	// Update vocab list if last refresh was too long ago (and replace afterwards), or old version
	else
	{
		console.log("Downloading new vocab data...");

		GM_xmlhttpRequest({
			method: "GET",
			url: "http://www.wanikani.com/api/v1.2/user/" + API_KEY + "/vocabulary/",
			onload: function(response)
			{
				var json;

				try {
					json = JSON.parse(response.responseText);
				} catch (e) {
					alert("Unable to process WaniKani data", e);
				}

				if (json)
				{
					GM_setValue("refreshTime", currentTime);

					// Create the vocab map that will be stored
					var vocabMap = {};
					// Loop through all received words
					var vocabList = json.requested_information.general;

					for (var i in vocabList)
					{
						var vocab = vocabList[i];

						// Split multiple spellings
						var meanings = vocab.meaning.split(", ");

						// Find longest meaning (for sorting intelligently)
						// Also, conjugate verbs
						var maxLength = 0;
						var conjugations = [];
						for (var m in meanings)
						{
							var thisLength = meanings[m].length;

							// If a verb...
							if (/^to /.test(meanings[m]))
							{
								// Remove leading 'to'
								meanings[m] = meanings[m].substr(3);

								if (!/ /.test(meanings[m]))
									conjugations.push(meanings[m] + "ed", meanings[m] + "es", meanings[m] + "en", meanings[m] + "ing");

								// Verbs should be replaced last ('part' more important than 'to part')
								thisLength -= 100;
							}

							// Ensure plural and 's' verb form
							if (meanings[m].length >= 3 && meanings[m].slice(-1) != "s")
								conjugations.push(meanings[m] + "s");

							if (thisLength > maxLength)
								maxLength = meanings[m].length;
						}
						meanings.push.apply(meanings, conjugations);

						// After updating the meanings,
						for (var m in meanings)
						{
							vocabMap[meanings[m]] = vocab.character;
						}
					}

					// Update the new vocab list in the storage
					GM_setValue("vocab", JSON.stringify(vocabMap));
					GM_setValue("formatVer", FORMAT_VER);

					// Now, as usual, replace the vocab and we're done
					replaceVocab(vocabMap);
				}
		  	}
		});
	}


}, false);

function replaceVocab(vocabMap)
{
	console.log("Replacing vocab...", vocabMap);

	var replaceCallback = function(str)
	{
    	var translation = vocabMap[str.toLowerCase()];
    	if (translation)
    		return '<span class="wanikanified" title="' + str + '" data-en="' + str + '" data-jp="' + translation +
        		'" onClick="var t = this.getAttribute(\'title\'); this.setAttribute(\'title\', this.innerHTML); this.innerHTML = t;">' + translation + '<\/span>';

        // Couldn't replace anything, leave as is
        return str;
    }

    var nodes = $("body *:not(noscript):not(script):not(style)");

	nodes.replaceText(/\b(\S+\s+\S+\s+\S+\s+\S+)\b/g, replaceCallback);
	nodes.replaceText(/\b(\S+\s+\S+\s+\S+)\b/g, replaceCallback);
	nodes.replaceText(/\b(\S+\s+\S+)\b/g, replaceCallback);
	nodes.replaceText(/\b(\S+)\b/g, replaceCallback);

	console.log("Vocab replaced!");	
}

/*
 * jQuery replaceText - v1.1 - 11/21/2009
 * http://benalman.com/projects/jquery-replacetext-plugin/
 * 
 * Copyright (c) 2009 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function($){$.fn.replaceText=function(b,a,c){return this.each(function(){var f=this.firstChild,g,e,d=[];if(f){do{if(f.nodeType===3){g=f.nodeValue;e=g.replace(b,a);if(e!==g){if(!c&&/</.test(e)){$(f).before(e);d.push(f)}else{f.nodeValue=e}}}}while(f=f.nextSibling)}d.length&&$(d).remove()})}})(jQuery);