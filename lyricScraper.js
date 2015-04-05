var http = require("http");
var request = require("request");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var db = mongoose.connection;

db.on("error", console.error);
db.once("open", function() {

});

mongoose.connect("mongodb://localhost/lyricScraper");

var lookupSchema = new mongoose.Schema({
    source: String,
    lyrics: String, 
    title: String,
    artist: String,
    album: String,
    accessdate: Date,
    accessutc: Number,
    url: String
});

var LyricSiteQuery = mongoose.model("LyricSiteQuery",lookupSchema);



function scrapSites(urlSegments) {
    var obj = {};
    obj.query = {};
    if (urlSegments[2].toLowerCase()==="artist")
        obj.query.artist = urlSegments[3];
    if (urlSegments[4].toLowerCase()==="title")
        obj.query.title = urlSegments[5];
    if (urlSegments[6].toLowerCase()==="format")
        obj.query.format = urlSegments[7].toLowerCase();
    else 
        obj.query.format = "json";
    if (urlSegments[8].toLowerCase()==="usecache")
        obj.query.usecache = urlSegments[9].toLowerCase()==="yes";
    else
        obj.query.usecache = true;
    obj.results = [];
    setTimeout(scrapeGenius,5,urlSegments,obj);
    setTimeout(scrapeSongLyricsDotCom,5,urlSegments,obj);
    return obj;
}

function scrapeGenius(urlSegments, obj) {
    // genius.com
    // from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes
    // to 
    // http://genius.com/search?q=maroon+5+she+will+be+loved+
    var geniusStr = "http://genius.com/search?q=";
    geniusStr += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    geniusStr += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    console.log(geniusStr);

    var finalURL;
    var dbobj;
    function geniusLyricLinkScrape(url) {
        finalURL=url;
        console.log(url);

        // tries to see if an existing query exists
        LyricSiteQuery.findOne({"url":url}, function(err, doc) { 
            dbobj = doc;
            // reads all info from mongodb ONLY IF database has entry and user wants to use cache
            if (dbobj && obj.query.usecache) { 
                var genius = {};

                for (var field in LyricSiteQuery.schema.paths) {
                    if (field.charAt(0) !== "_") {
                        genius[field] = dbobj[field];
                    }
                }
                console.log(genius);
                obj.results.push(genius);
            } else { // http request to query actual lyrics site
                request({
                    uri: url,
                    method: "GET", 
                    timeout: 2000,
                    followRedirect:true,
                    maxRedirects: 10
                }, lyricUrlRequest);
            }
        });
    }

    function lyricUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        var $ = cheerio.load(html);
        var title = $("h1.title_and_authors span.text_title").text().trim();
        var artist = $("h1.title_and_authors span.text_artist").text().trim();
        var album = $("a.collection_title span").text().trim();
        var lucky = $("div.lyrics p").text();
        //console.log(lucky);
        console.log("genius.com Lyrics Ready");
        var genius = {};
        genius.source = "genius.com";
        genius.lyrics = lucky;
        genius.title = title;
        genius.artist = artist;
        genius.album = album;
        genius.accessdate = new Date();
        genius.accessutc = genius.accessdate.getTime();
        genius.url = finalURL;


        if (!dbobj) { // if database did not have entry, make new entry
            dbobj = new LyricSiteQuery(genius);
            console.log(dbobj);
            dbobj.save(function (err,dbobj) {
                if (err) 
                    console.log(err);
            });
        } else { // update existing document with newly fetched fields
            for (var field in genius) {
                dbobj[field] = genius[field];
            }
        }
        
        obj.results.push(genius);
    }

    function searchUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        //console.log(html);
        var $ = cheerio.load(html);
        var lucky = $("li.search_result a");
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
    // from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes
    // to 
    // http://www.songlyrics.com/index.php?section=search&searchW=maroon+5+she+will+be+loved+&submit=Search
    var searchURL = "http://www.songlyrics.com/index.php?section=search&searchW=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    searchURL += "&submit=Search";
    console.log(searchURL);

    var finalURL;
    function lyricLinkScrape(url) {
        console.log(url);
        finalURL=url;
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
        var lucky = $("#songLyricsDiv").text();
        var title = $("div.pagetitle h1").text().split("-")[1].split("Lyrics")[0].trim();
        var artist = $($("div.pagetitle p a")[0]).text().trim();
        var album = $($("div.pagetitle p a")[1]).text().trim();
        //console.log(lucky);
        console.log("songlyrics.com Lyrics Ready");
        songlyricsdotcom = {};
        songlyricsdotcom.source = "songlyrics.com";

        songlyricsdotcom.lyrics = lucky;
        songlyricsdotcom.title = title;
        songlyricsdotcom.artist = artist;
        songlyricsdotcom.album = album;
        var now = new Date();
        songlyricsdotcom.accessdate = now;
        songlyricsdotcom.accessutc = now.getTime();
        songlyricsdotcom.url = finalURL;
        obj.results.push(songlyricsdotcom);
    }

    function searchUrlRequest(err,res,html) {
        if (!(!err && res.statusCode === 200)) 
            return;
        //console.log(html);
        var $ = cheerio.load(html);
        var lucky = $("div.serpresult a");
        //console.log(lucky);
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
    //console.log(req);
    //res.writeHead(200);
    var url = req.url;
    console.log("Received access: "+url);
    var segments = url.split("/");
    //console.log(segments);
    if (segments.length >= 2 && segments[1].toLowerCase() === "search") {
        var objResult = scrapSites(segments);
        function waitForAtLeastOne () {
            if (objResult.results.length<2) {
                setTimeout(waitForAtLeastOne,200);
            } else {
                if (objResult.query.format === "json") {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(objResult, null, 4));
                } else {
                    res.writeHead(200);
                    res.write("HELLO");
                    res.end();
                }
                
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