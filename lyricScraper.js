var http = require('http');
var request = require('request');
var cheerio = require('cheerio');




function scrapSites(urlSegments) {
    var obj = {};
    obj.genius = {};
    obj.genius.loaded = false;
    obj.songlyricsdotcom = {};
    obj.songlyricsdotcom.loaded = false;
    setTimeout(scrapeGenius,5,urlSegments,obj);
    setTimeout(scrapeSongLyricsDotCom,5,urlSegments,obj);
    //scrapeGenius(urlSegments, obj)
    //scrapeSongLyricsDotCom(urlSegments, obj);
    return obj;
}

function scrapeGenius(urlSegments, obj) {
    // genius.com
    // from /search/artist/maroon+5/title/she+will+be+loved
    // to 
    // http://genius.com/search?q=maroon+5+she+will+be+loved+
    var geniusStr = "http://genius.com/search?q=";
    geniusStr += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    geniusStr += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    console.log(geniusStr);


    function geniusLyricLinkScrape(url) {
        console.log(url);
        request({
            uri: url,
            method: "GET", 
            timeout: 2000,
            followRedirect:true,
            maxRedirects: 10
        }, lyricUrlRequest);
    }

    function lyricUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        var $ = cheerio.load(html);
        var title = $('h1.title_and_authors span.text_title').text().trim();
        var artist = $('h1.title_and_authors span.text_artist').text().trim();
        var album = $('a.collection_title span').text().trim();
        var lucky = $('div.lyrics p').text();
        //console.log(lucky);
        console.log("Genius Lyrics Ready");
        obj.genius.lyrics = lucky;
        obj.genius.title = title;
        obj.genius.artist = artist;
        obj.genius.album = album;
        obj.genius.loaded = true;
    }

    function searchUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        //console.log(html);
        var $ = cheerio.load(html);
        var lucky = $('li.search_result a');
        //console.log(lucky);
        if (!lucky || !lucky["0"] || !lucky["0"].attribs || !lucky["0"].attribs.href)
            return;
        var link = lucky["0"].attribs.href;

        geniusLyricLinkScrape(link);
    }

    request({
        uri: geniusStr,
        method: "GET", 
        timeout: 2000,
        followRedirect:true,
        maxRedirects: 10
    }, searchUrlRequest);
}


function scrapeSongLyricsDotCom(urlSegments, obj) {
    // songlyrics.com
    // from /search/artist/maroon+5/title/she+will+be+loved
    // to 
    // http://www.songlyrics.com/index.php?section=search&searchW=maroon+5+she+will+be+loved+&submit=Search
    var searchURL = "http://www.songlyrics.com/index.php?section=search&searchW=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    searchURL += "&submit=Search";
    console.log(searchURL);


    function lyricLinkScrape(url) {
        console.log(url);
        request({
            uri: url,
            method: "GET", 
            timeout: 2000,
            followRedirect:true,
            maxRedirects: 10
        }, lyricUrlRequest);
    }

    function lyricUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        var $ = cheerio.load(html);
        var lucky = $('#songLyricsDiv').text();
        var title = $('div.pagetitle h1').text().split("-")[1].split("Lyrics")[0].trim();
        var artist = $($('div.pagetitle p a')[0]).text().trim();
        var album = $($('div.pagetitle p a')[1]).text().trim();
        //console.log(lucky);
        console.log("SongLyrics.com Lyrics Ready");
        obj.songlyricsdotcom.lyrics = lucky;
        obj.songlyricsdotcom.title = title;
        obj.songlyricsdotcom.artist = artist;
        obj.songlyricsdotcom.album = album;
        obj.songlyricsdotcom.loaded = true;
    }

    function searchUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        //console.log(html);
        var $ = cheerio.load(html);
        var lucky = $('div.serpresult a');
        console.log(lucky);
        if (!lucky || !lucky["0"] || !lucky["0"].attribs || !lucky["0"].attribs.href)
            return;
        var link = lucky["0"].attribs.href;

        lyricLinkScrape(link);
    }

    request({
        uri: searchURL,
        method: "GET", 
        timeout: 2000,
        followRedirect:true,
        maxRedirects: 10
    }, searchUrlRequest);
}



function responseCallback (req, res) {
    console.log(req);
    //res.writeHead(200);
    var url = req.url;
    var segments = url.split("/");
    console.log(segments);
    if (segments.length >= 2 && segments[1].toLowerCase() === "search") {
        var objResult = scrapSites(segments);
        function waitForAtLeastOne () {
            if (!objResult.genius.loaded || !objResult.songlyricsdotcom.loaded) {
                setTimeout(waitForAtLeastOne,200);
            } else {
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(objResult, null, 4));
            }
        }
        setTimeout(waitForAtLeastOne,200);
    } else {
        res.writeHead(200);
        res.write("HELLO");
        res.end();
    }
}

var server = http.createServer(responseCallback);
server.listen(22096);