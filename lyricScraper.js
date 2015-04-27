var http = require("http");
var request = require("request");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var async = require("async");
var db = mongoose.connection;

var dbConnected = false;
db.on("error", function(err) {
    if (!err) {
        dbConnected = true;
    }
});
db.once("open", function() {
});


// Database is named lyricScraper
// Suggested that the database be stored in a working directory
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




var geniusSiteOptions = {};
// genius.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to 
// http://genius.com/search?q=maroon+5+she+will+be+loved+
geniusSiteOptions.name = "genius.com";
geniusSiteOptions.getLyricLink = function ($) {
    var lucky = $("li.search_result a");
    if (!lucky || !lucky["0"] || !lucky["0"].attribs || !lucky["0"].attribs.href)
        return;
    var link = lucky["0"].attribs.href;
    return link;
};
geniusSiteOptions.buildSearchURL = function(urlSegments) {
    var searchURL = "http://genius.com/search?q=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    return searchURL;
};
geniusSiteOptions.getSongInfo = function ($) {
    var title = $("h1.title_and_authors span.text_title").text().trim();
    var artist = $("h1.title_and_authors span.text_artist").text().trim();
    var album = $("a.collection_title span").text().trim() || $(".album_title_and_track_number").text().trim();
    var lucky = $("div.lyrics p").text();
    //console.log(lucky);
    var genius = {};
    genius.source = "genius.com";
    genius.lyrics = lucky;
    genius.title = title;
    genius.artist = artist;
    genius.album = album;
    genius.accessdate = new Date();
    genius.accessutc = genius.accessdate.getTime();
    return genius;
};


var songlyricsdotcomSiteOptions = {};
// songlyrics.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to 
// http://www.songlyrics.com/index.php?section=search&searchW=maroon+5+she+will+be+loved+&submit=Search
songlyricsdotcomSiteOptions.name = "songlyrics.com";
songlyricsdotcomSiteOptions.getLyricLink = function ($) {
    var lucky = $("div.serpresult a");
    if (!lucky || !lucky["0"] || !lucky["0"].attribs || !lucky["0"].attribs.href)
        return;
    var link = lucky["0"].attribs.href;
    return link;
};
songlyricsdotcomSiteOptions.buildSearchURL = function(urlSegments) {
    var searchURL = "http://www.songlyrics.com/index.php?section=search&searchW=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    searchURL += "&submit=Search";
    return searchURL;
};
songlyricsdotcomSiteOptions.getSongInfo = function ($) {
    var lucky = $("#songLyricsDiv").text();
    var title = $("div.pagetitle h1").text().split("-")[1].split("Lyrics")[0].trim();
    var artist = $($("div.pagetitle p a")[0]).text().trim();
    var album = $($("div.pagetitle p a")[1]).text().trim();
    //console.log(lucky);
    result = {};
    result.source = "songlyrics.com";

    result.lyrics = lucky;
    result.title = title;
    result.artist = artist;
    result.album = album;
    result.accessdate = new Date();
    result.accessutc = result.accessdate.getTime();
    return result;
};

/*var metrolyricsSiteOptions = {};
// metrolyrics.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to
// http://www.metrolyrics.com/search.html?search=maroon+5+she+will+be+loved+
metrolyricsSiteOptions.name = "metrolyrics.com";
metrolyricsSiteOptions.getLyricLink = function ($) {
    var lucky = $("div.songs div.content ul li a");
    console.log(lucky);
    if (!lucky || !lucky["0"] || !lucky["0"].attribs || !lucky["0"].attribs.href)
        return;
    var link = lucky["0"].attribs.href;
    return link;
};
metrolyricsSiteOptions.buildSearchURL = function(urlSegments) {
    var searchURL = "http://www.metrolyrics.com/search.html?search=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "+": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "+": "");
    return searchURL;
};
metrolyricsSiteOptions.getSongInfo = function ($) {
    var lucky = $("#lyrics-body-text").text().trim();
    var title = $("div.lyrics h1").text().trim().split("Lyrics")[0].trim();
    var artist = $("div.artist-header h2").text().trim().split("Lyrics")[0].trim();
    var album = $(".album-name a").text().trim();
    result = {};
    result.source = "metrolyrics.com";

    result.lyrics = lucky;
    result.title = title;
    result.artist = artist;
    result.album = album;
    result.accessdate = new Date();
    result.accessutc = result.accessdate.getTime();
    return result;

};*/ // currently dynamic sites (angularJS and co.) cannot be scraped yet.

var lyricsModeSiteOptions = {};
// lyricsmode.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to
// http://www.lyricsmode.com/search.php?search=maroon%205%20she%20will%20be%20loved%20
lyricsModeSiteOptions.name = "lyricsmode.com";
lyricsModeSiteOptions.getLyricLink = function ($) {
    var lucky = $("table a.search_highlight");
    //console.log(lucky);
    if (!lucky || !lucky["1"] || !lucky["1"].attribs || !lucky["1"].attribs.href)
        return;
    var link = "http://www.lyricsmode.com"+lucky["1"].attribs.href;
    return link;
};
lyricsModeSiteOptions.buildSearchURL = function(urlSegments) {
    var searchURL = "http://www.lyricsmode.com/search.php?search=";
    searchURL += (urlSegments[2].toLowerCase()==="artist"? urlSegments[3].toLowerCase() + "%20": "");
    searchURL += (urlSegments[4].toLowerCase()==="title"? urlSegments[5].toLowerCase() + "%20": "");
    return searchURL;
};
lyricsModeSiteOptions.getSongInfo = function ($) {
    var lucky = $("#lyrics_text").text().trim();
    var title = $(".header-song-name").text().trim().split("lyrics")[0].trim();
    var artist = $(".header-band-name").text().trim();
    var album = "";
    result = {};
    result.source = "lyricsmode.com";

    result.lyrics = lucky;
    result.title = title;
    result.artist = artist;
    result.album = album;
    result.accessdate = new Date();
    result.accessutc = result.accessdate.getTime();
    return result;

};




function scrapSites(urlSegments, obj) {
    
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
    if (urlSegments[10].toLowerCase()==="store")
        obj.query.store = urlSegments[11].toLowerCase()==="yes";
    else
        obj.query.store = true;
    if (urlSegments[12].toLowerCase()==="minimum")
        obj.query.minimum = Number(urlSegments[13]);
    else
        obj.query.minimum = 2;
    obj.query.failed = 0;
    obj.query.totalsites = 3;
    obj.results = [];
    setTimeout(scrapeCustomSite,5,urlSegments,obj,geniusSiteOptions);
    setTimeout(scrapeCustomSite,5,urlSegments,obj,songlyricsdotcomSiteOptions);
    //setTimeout(scrapeCustomSite,5,urlSegments,obj,metrolyricsSiteOptions);
    setTimeout(scrapeCustomSite,5,urlSegments,obj,lyricsModeSiteOptions);


    //setTimeout(scrapeSongLyricsDotCom,5,urlSegments,obj);
    return obj;
};

function scrapeCustomSite(urlSegments, obj, customSiteInfo) {
    
    var searchURL = customSiteInfo.buildSearchURL(urlSegments);

    
    console.log(searchURL);

    var finalURL = null; // final lyric scraping URL
    var dbobj = null; // Database obj if it exists, is stored 

    // Attempts to use site's search first,
    // takes the first entry listed, hence the name "lucky", like Google's "I'm Feeling Lucky"
    // Either looks up URL in database to see if its been previously accessed, then
    // Loads that entry's URL, and scrapes if the user specified, or loads from cache otherwise


    var lastCalledFunction = null; // so err callback knows which one.


    async.waterfall([
        function sendRequest(callback) {
            lastCalledFunction = "sendRequest";
            request({
                uri: searchURL,
                method: "GET", 
                timeout: 10000,
                followRedirect:true,
                maxRedirects: 10
            }, callback);
        },
        function searchURLRequestCallback(res,html, callback) {
            lastCalledFunction = "searchURLRequestCallback";
            /*if (!(!err && res.statusCode === 200)) {
                console.log("Error searching "+customSiteInfo.name, err);
                return;
            }*/
            console.log("Searching "+ customSiteInfo.name);

            var $ = cheerio.load(html);
            var url = customSiteInfo.getLyricLink($); // call custom site scraper
            if (!url) {
                console.log("Error scraping link from "+customSiteInfo.name);
                // decrement max amount of sites that can be displayed since sites found nothing.
                ++obj.query.failed;
            }

            finalURL = url;
            console.log("Lyric URL is:",url);


            // tries to see if an existing query exists
            if (dbConnected)
                LyricSiteQuery.findOne({"url":url}, callback);
            else
                callback(null, null);
        }, 
        function mongoDBCacheLookupCallback(doc, callback) { 
            lastCalledFunction = "mongoDBCacheLookupCallback";
            /*if (err) {
                console.log("Database lookup (Read) Error",err,doc);
            }*/
            dbobj = doc;
            //if (dbobj) console.log(dbobj.id, dbobj._id, dbobj);
            // reads all info from mongodb ONLY IF database has entry and user wants to use cache

            if (dbobj && obj.query.usecache) { 
                var result = {};

                for (var field in LyricSiteQuery.schema.paths) {
                    if (field.charAt(0) !== "_") {
                        result[field] = dbobj[field];
                    }
                }
                result.id = dbobj.id;
                result.links = {};
                result.links.href = "/id/"+result.id;

                //console.log(result);
                if (!obj.query.store) {
                    dbobj.remove(function(err,dbobj){
                        if (err) {
                            console.log("Remove Error",err,dbobj);
                        }
                    });
                }
                obj.results.push(result);
            } else { // http request to query actual lyrics site
                request({
                    uri: finalURL,
                    method: "GET", 
                    timeout: 10000,
                    followRedirect:true,
                    maxRedirects: 10
                }, callback);
            }
        },
        function lyricURLRequestCallback(res,html, callback) { // callback for when the final lyric page loads
            /*if (!(!err && res.statusCode === 200)) {
                console.log("Error, loading lyric page failed",err);
                return;
            }*/
            lastCalledFunction = "lyricURLRequestCallback";
            var $ = cheerio.load(html);

            var result = customSiteInfo.getSongInfo($); // call custom site scraper
            result.url = finalURL;
            
            
            console.log(customSiteInfo.name+" Lyrics Ready");

            function databaseFinishCallback() {
                if (dbobj) {
                    result.id = dbobj.id;
                    result.links = {};
                    result.links.href = "/id/"+result.id;
                }
                
                obj.results.push(result);
            }
            if (!dbConnected) 
                databaseFinishCallback();

            if (!dbobj) { // if database did not have entry, make new entry
                dbobj = new LyricSiteQuery(result);
                dbobj.save(function (err,dbobj) {
                    if (err) {
                        console.log("Create Error",err,dbobj);
                        return;
                    }
                    databaseFinishCallback();
                });
            } else { // update existing document with newly fetched fields
                dbobj.update(result,function(err,dobj) {
                    if (err) {
                        console.log("Update Error",err,dbobj);
                        return;
                    }
                    databaseFinishCallback();
                });//.exec();
            }
            if (!obj.query.store) {
                dbobj.remove(function(err,dbobj){
                    if (err) {
                        console.log("Remove Error",err,dbobj);
                        return;
                    }
                    databaseFinishCallback();
                });
            }
            
        }
    ], function (err, arg1, arg2, arg3) {
        if (err) {
            switch(lastCalledFunction) {
                case "sendRequest": 
                    console.log("Error searching "+customSiteInfo.name, err);
                    break;
                case "searchURLRequestCallback": 
                    // arg1 = doc
                    console.log("Database lookup (Read) Error",err,arg1); 
                    break;
                case "mongoDBCacheLookupCallback":
                    console.log("Error, loading lyric page failed",err);
                    break;
                case "lyricURLRequestCallback":

                    break;
            }
        }
    });
}



// ROUTING THINGS ARE BELOW
var urlRouter = {};
urlRouter.invalid = function(req, res) {
    var toJson = { "request": req.url,
                    "method": req.method,
                    "message": "Invalid, refer to /"
    };
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(toJson, null, 4));
}
urlRouter["/"] = function(req, res) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.write("Hello. Welcome to the lyricScraper text/JSON based API\n");
    res.write("\n");
    res.write("\n");
    res.write("Use the following template for queries:\n");
    res.write("\n");
    res.write("/search/artist/[artist-name]/title/[song-name]/format/[filetype,default=json]/usecache/[yes|no,default=yes]/store/[yes|no,default=yes]/minimum/[number of results]\n");
    res.write("Multiple words are separated with \+, like in \"maroon+5\"\n");
    res.write("\n");
    res.write("\n");
    res.write("Go to the following link to delete the cache:\n");
    res.write("\n");
    res.write("/deleteall\n");

    res.end();
};
urlRouter["/search"] = function(req, res) {
    var url = req.url;
    var segments = url.split("/");

    var objResult = {};
    objResult.request = url;
    objResult.method = req.method, 
    objResult.message = null;

    if (segments.length<3) {
        objResult.message = "Invalid, use "+"/search/artist/[artist-name]/title/[song-name]/format/[filetype,default=json]/usecache/[yes|no,default=yes]/store/[yes|no,default=yes]/minimum/[number of results]";
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(toJson, null, 4));
        return;
    }
    
    objResult.message = scrapSites(segments, objResult) ? "Found" : "Not found";
    if (!dbConnected)
        objResult.message += ", database not connected"
    
    var now = new Date();
    function waitForAtLeastX () {
        if (objResult.results.length<objResult.query.minimum && 
            objResult.results.length+objResult.query.failed < objResult.query.totalsites) {
            // less than minimum BUT ALSO having not all sites scanned

            setTimeout(waitForAtLeastX,200);
        } else {
            if (objResult.query.format === "json") {
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(objResult, null, 4));
            } else {
                res.writeHead(200, {"Content-Type": "text/plain"});
                res.write("Query to online lyric sites timed out.");
                res.end();
            }
            
        }
    }
    setTimeout(waitForAtLeastX,200);
};
urlRouter["/id"] = function(req, res) {
    var toJson = { "request": req.url,
                    "method": req.method
    };
    var segments = req.url.split("/");
    if (segments.length<3){
        toJson.message = "Invalid, use /id/xxxxxx";
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(toJson, null, 4));
        return;
    }
    if (!dbConnected) {
        toJson.message = "Database not connected";
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(toJson, null, 4));
        return;
    }

    //console.log(req.method);
    LyricSiteQuery.findById(segments[2], function searchbyIdCallback(err, dbobj) {
        var toJson = { "request": req.url,
                        "method": req.method
        };

        if (err || !dbobj) {
            toJson.message = "Not found";

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(toJson, null, 4));
            return;
        }

        if (req.method === "GET") {
            var result = {};
            for (var field in LyricSiteQuery.schema.paths) {
                if (field.charAt(0) !== "_") {
                    result[field] = dbobj[field];
                }
            }
            result.id = dbobj.id;
            result.links = {};
            result.links.href = "/id/"+result.id;
            
            toJson.results = [result];
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(toJson, null, 4));
        } else if (req.method === "DELETE") {
            dbobj.remove(function(err,dbobj){
                if (err) {
                    console.log("Remove Error",err,dbobj);
                    return;
                }
                toJson.message = "Item deleted";
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(toJson, null, 4));
            });
        } else {
            toJson.message = "Invalid";
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(toJson, null, 4));
        }

        
    });
};
urlRouter["/deleteall"] = function(req, res) {
    if (!dbConnected) {
        var toJson = { "request": req.url,
                        "method": req.method,
                        "message": "Database not connected"
        };
        console.log("Database not connected");
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(toJson, null, 4));
    }
    LyricSiteQuery.remove({}, function(err) {
        var toJson = { "request": req.url,
                        "method": req.method,
                        "message": "Entire cache deleted"
        };
        console.log("Lyrics cache deleted");
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(toJson, null, 4));
    });

};



// RUN SERVER 
function responseCallback (req, res) {
    //console.log(req);
    //res.writeHead(200);
    var url = req.url;
    console.log("Received access: "+url);
    var router = url.substring(0,url.indexOf("/",1))

    if (url === "/") {
        setTimeout(urlRouter["/"], 2, req, res);
    } else if (urlRouter[router]) {
        setTimeout(urlRouter[router], 2, req, res);
    } else {
        setTimeout(urlRouter.invalid, 2, req, res);
    }
}


var server = http.createServer(responseCallback);
server.listen(22096);