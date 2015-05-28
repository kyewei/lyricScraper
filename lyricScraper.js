//Kye Wei
//github.com/kyewei/lyricScraper

var http = require("http");
var request = require("request");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var async = require("async");
var express = require("express");
var bodyParser = require('body-parser')

var app = express();
var port = process.env.PORT || 22096;
var router = express.Router();


app.get("/", function (req, res) {
    res.sendFile(__dirname + "/lyricScraper.html");
});

app.use("/api", router);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
app.listen(port);
app.set('json spaces', 4);


var db = mongoose.connection;

var dbConnected = true;
db.on("error", function(err) {
    if (err) {
        console.log("Database not connected!")
        dbConnected = false;
    }
});
db.once("open", function() {
});


// Database is named lyricScraper
// Suggested that the database be stored in a working directory
// I set an environment variable on Heroku's Dyno.
var uri = process.env.MONGOLAB_URI || "mongodb://localhost/lyricScraper";
mongoose.connect(uri);

var lyricDataSchema = new mongoose.Schema({
    source: String,
    lyrics: String, 
    artist: String,
    title: String,
    album: String,
    accessdate: Date,
    accessutc: Number,
    url: String
});

var searchQuerySchema = new mongoose.Schema({
    title: String,
    artist: String,
    sitemax: Number,
    accessdate: Date,
    accessutc: Number,
    queryresults: [ { site: String, choices: [ {title: String, artist: String, url: String} ] } ]
});

var lyricData = mongoose.model("lyricData",lyricDataSchema);
var searchQuery = mongoose.model("searchQuery",searchQuerySchema);



var geniusSiteOptions = {};
// genius.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to 
// http://genius.com/search?q=maroon+5+she+will+be+loved+
geniusSiteOptions.name = "genius.com";
geniusSiteOptions.getLyricLink = function ($,n) {
    var links = $("li.search_result a");
    var titles = $("li.search_result a .song_title");
    var artists = $("li.search_result a .primary_artist_name");
    if (links.length === 0 || titles.length === 0 || artists.length === 0)
        return;
    var result = [];
    for (var i=0; i < n; ++i) {
        if (links[i] && titles[i] && artists[i]) {
            result.push({"title": $(titles[i]).text(),
                            "artist": $(artists[i]).text(),
                            "url": links[i].attribs.href
                        });
        }
    }
    return result;
};
geniusSiteOptions.buildSearchURL = function(obj) {
    var searchURL = "http://genius.com/search?q=";
    searchURL += obj.query.artist ? obj.query.artist.toLowerCase().replace(/ /g,"+") + "+": "";
    searchURL += obj.query.title ? obj.query.title.toLowerCase().replace(/ /g,"+") + "+": "";
    return searchURL;
};
geniusSiteOptions.getSongInfo = function ($) {
    var title = $("h1.title_and_authors span.text_title").text().trim();
    var artist = $("h1.title_and_authors span.text_artist").text().trim();
    var album = $("a.collection_title span").text().trim() || $(".album_title_and_track_number").text().trim();
    var lucky = $("div.lyrics p").text();
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
songlyricsdotcomSiteOptions.getLyricLink = function ($,n) {
    var links = $("div.serpresult h3 a");
    var info = $("div.serpresult .serpdesc-2 a");
    if (links.length === 0 || info.length === 0)
        return;
    var result = [];
    for (var i=0; i < n; ++i) {
        if (links[i] && info[2*i]) {
            result.push({"title": links[i].attribs.title,
                            "artist": $(info[2*i]).text(),
                            "url": links[i].attribs.href
                        });
        }
    }
    return result;
};
songlyricsdotcomSiteOptions.buildSearchURL = function(obj) {
    var searchURL = "http://www.songlyrics.com/index.php?section=search&searchW=";
    searchURL += obj.query.artist ? obj.query.artist.toLowerCase().replace(/ /g,"+") + "+": "";
    searchURL += obj.query.title ? obj.query.title.toLowerCase().replace(/ /g,"+") + "+": "";
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

 // currently dynamic sites (angularJS and co.) cannot be scraped yet.

var lyricsModeSiteOptions = {};
// lyricsmode.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to
// http://www.lyricsmode.com/search.php?search=maroon%205%20she%20will%20be%20loved%20
lyricsModeSiteOptions.name = "lyricsmode.com";
lyricsModeSiteOptions.getLyricLink = function ($,n) {
    var info = $("table a.search_highlight");
    if (info.length === 0)
        return;
    var result = [];
    for (var i=0; i < n; ++i) {
        if (info[2*i]) {
            result.push({"artist": $(info[2*i]).text(),
                            "title": $(info[2*i+1]).text().split("lyrics")[0].trim(),
                            "url": "http://www.lyricsmode.com"+info[2*i+1].attribs.href
                        });
        }
    }
    //console.log(result);
    return result;
};
lyricsModeSiteOptions.buildSearchURL = function(obj) {
    var searchURL = "http://www.lyricsmode.com/search.php?search=";
    searchURL += obj.query.artist ? obj.query.artist.toLowerCase().replace(/ /g,"+") + "%20": "";
    searchURL += obj.query.title ? obj.query.title.toLowerCase().replace(/ /g,"+") + "%20": "";
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

// Lookup table
var customSites = {};
customSites["genius.com"] = geniusSiteOptions;
customSites["songlyrics.com"] = songlyricsdotcomSiteOptions;
customSites["lyricsmode.com"] = lyricsModeSiteOptions;


var databaseRefreshRate = 60*60*1000; // 60 minutes in milliseconds

function scrapSites(queryStr, obj) {
    
    obj.query = {};
    queryStr.split(/&/).map(function addQueryToObj (str) {
        var a = str.split(/=/);
        //console.log(str);
        obj.query[a[0].toLowerCase()] = a[1].replace(/\+/g," ");
    });
    if (!obj.query.format) {
        obj.query.format = "json";
    }
    if (obj.query.minimum) {
        obj.query.minimum = Number(obj.query.minimum);
    } else {
        obj.query.minimum = 2;
    }

    obj.query.failed = 0;
    obj.query.totalsites = 3;
    obj.results = [];
    setTimeout(scrapeCustomSite,5,obj,geniusSiteOptions);
    setTimeout(scrapeCustomSite,5,obj,songlyricsdotcomSiteOptions);
    setTimeout(scrapeCustomSite,5,obj,lyricsModeSiteOptions);


    //setTimeout(scrapeSongLyricsDotCom,5,obj);
    return obj;
};

function scrapeCustomSite(obj, customSiteInfo) {
    
    var searchURL = customSiteInfo.buildSearchURL(obj);

    
    console.log(searchURL);

    var finalUrl = null; // final lyric scraping URL
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
            var urlArr = customSiteInfo.getLyricLink($,1); // call custom site scraper
            if (!urlArr || urlArr.length === 0) {
                console.log("Error scraping link from "+customSiteInfo.name);
                // decrement max amount of sites that can be displayed since sites found nothing.
                ++obj.query.failed;
                return;
            }
            //console.log(urlArr);

            finalUrl = urlArr[0].url;
            console.log("Lyric URL is:",finalUrl);

            // tries to see if an existing query exists
            if (dbConnected)
                lyricData.findOne({"url":finalUrl}, callback);
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

            if (dbobj) { 
                var result = {};

                for (var field in lyricData.schema.paths) {
                    if (field.charAt(0) !== "_") {
                        result[field] = dbobj[field];
                    }
                }
                result.id = dbobj.id;
                result.apiUrl = "/api/id/"+result.id;

                obj.results.push(result);
            } else { // http request to query actual lyrics site
                request({
                    uri: finalUrl,
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
            result.url = finalUrl;
            
            
            console.log(customSiteInfo.name+" Lyrics Ready");

            function databaseFinishCallback() {
                if (dbobj) {
                    result.id = dbobj.id;
                    result.apiUrl = "/api/id/"+result.id;
                }
                
                obj.results.push(result);
            }
            if (!dbConnected) 
                databaseFinishCallback();

            if (!dbobj) { // if database did not have entry, make new entry
                dbobj = new lyricData(result);
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




// Express Routing things.

router.use(function (req, res, next) {
    console.log("Request "+ req.method +" /api"+req.url);
    next();
});
router.get("/", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    toJSON.message = "Welcome to the lyricScraper RESTful JSON API";
    toJSON.next = {};
    toJSON.next.query = { "apiUrl": "/api/query/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]",
                            "example": "/api/query/artist=maroon+5&title=she+will+be+loved&format=json&minimum=2",
                            "acceptedMethods": ["GET"]
    };
    toJSON.next.search = {  "search-parameters": ["artist", "title", "sitemax"],
                            "create": { "apiUrl": "/api/search",
                                        "example": "/api/search",
                                        "acceptedMethods": ["POST", "DELETE"] },
                            "modify-search-parameters": { "apiUrl": "/api/search/xxxxxxxxxxxxxxxxxxxxxxxx",
                                                            "example": "/api/search/553fe99a6dce0876189c92a5",
                                                            "acceptedMethods": ["GET", "PUT", "DELETE"] },
                            "view-site-results": { "apiUrl": "/api/search/xxxxxxxxxxxxxxxxxxxxxxxx/x",
                                                        "example": "/api/search/553fe99a6dce0876189c92a5/1",
                                                        "acceptedMethods": ["GET"] },
                            "view-individual-result": { "apiUrl": "/api/search/xxxxxxxxxxxxxxxxxxxxxxxx/x/x",
                                                        "example": "/api/search/553fe99a6dce0876189c92a5/1/2",
                                                        "acceptedMethods": ["GET"] }
    };
    toJSON.next.id = { "apiUrl": "/api/id/xxxxxxxxxxxxxxxxxxxxxxxx",
                        "example": "/api/id/553ea91f0c8580681ea30bdc",
                        "acceptedMethods": ["GET", "DELETE"]
    };
    res.json(toJSON);
});


router.route("/search")
.post(function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    var obj = {};
    obj.title = req.body.title || "";
    obj.artist = req.body.artist  || "";
    obj.sitemax = Number(req.body.sitemax)  || 2;
    obj.accessdate = new Date();
    obj.accessutc = obj.accessdate.getTime();
    var dbobj = new searchQuery(obj).save(function (err,dbobj) {
        if (err) {
            console.log("Create Error",err,dbobj);
            return;
        }
        toJSON.message = "New search created at: "+"/api/search/"+dbobj.id;
        res.json(toJSON);

        setTimeout(function(id) {
            searchQuery.findById(id, function searchbyIdCallback (err, dbobj) {
                if (err || !dbobj) {
                } else {
                    dbobj.remove(function(err,dbobj){
                        if (err) {
                            console.log("Failed to delete search item "+dbobj.id+" after 1 day.");
                        } else {
                            console.log("Search item "+dbobj.id+" deleted after 1 day.");
                        }
                    });
                }
            });
        }, 24*60*60*1000, dbobj.id); // deletes search object after a day
    });
})
.delete(function(req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    if (!dbConnected){
        toJSON.message = "Database not connected";
        res.json(toJSON);
    } else {
        searchQuery.remove({}, function(err) {
            toJSON.message = "Entire search cache deleted";
            res.json(toJSON);
        });
    }
});
router.route("/search/:id")
.all(function(req, res, next) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    res.toJSON = toJSON;
    if (!dbConnected) {
        res.toJSON.message = "Database not connected";
        res.json(res.toJSON);
        return;
    } 

    function makeLyricsRequest (dbobj, requestCallback) {
        var obj = { "query":{ "artist":dbobj.artist, "title":dbobj.title } };
        var oldqueryresults = dbobj.queryresults;
        dbobj.queryresults = [];
        dbobj.accessdate = new Date();
        dbobj.accessutc = dbobj.accessdate.getTime();
        var count = 0;
        var want = 3;

        function getSearchResult (customSiteInfo) {
            var searchURL = customSiteInfo.buildSearchURL(obj);
            async.waterfall([
                function sendRequest(callback) {
                    request({
                        uri: searchURL,
                        method: "GET", 
                        timeout: 10000,
                        followRedirect:true,
                        maxRedirects: 10
                    }, callback);
                },
                function searchURLRequestCallback(res, html, callback) {

                    var $ = cheerio.load(html);
                    var urlArr = customSiteInfo.getLyricLink($,dbobj.sitemax); // call custom site scraper
                    
                    if (!urlArr || urlArr.length === 0) {
                        console.log("Error scraping link from "+customSiteInfo.name);
                        callback(true, urlArr);
                    } else 
                        callback(null, urlArr);
                }],
                function handleErr(err, urlArr) {
                    if (err || !urlArr) {
                        console.log("Site scraping error");
                    } else {
                        var siteResult = { "site": customSiteInfo.name, "choices": urlArr};
                        dbobj.queryresults.push(siteResult)
                    }
                    ++count;
                });
        }
        setTimeout(getSearchResult,5,geniusSiteOptions);
        setTimeout(getSearchResult,5,songlyricsdotcomSiteOptions);
        setTimeout(getSearchResult,5,lyricsModeSiteOptions);
        setTimeout(function wait() {
            if (count < 3) 
                setTimeout(wait, 10);
             else {
                setTimeout(requestCallback, 2, dbobj);
             }
        }, 10);
    }
    searchQuery.findById(req.params.id, function searchbyIdCallback (err, dbobj) {
        if (err || !dbobj) {
            res.toJSON.message = "Search item not found";
            res.json(res.toJSON);
        } else {
            res.toJSON.message = "Found";
            res.dbobj = dbobj;
            res.makeLyricsRequest = makeLyricsRequest;
            next();
        }
    });
})
.get(function (req, res) {

    function searchResultsFetchedCallback(dbobj) {
        dbobj.save(); //async but doesn't matter
        var result = {};

        result.title = dbobj.title;
        result.artist = dbobj.artist;
        result.id = dbobj.id;
        result.accessdate = dbobj.accessdate;
        result.accessutc = dbobj.accessutc;
        result.apiUrl = "/api/search/"+result.id;
        result.queryresults = [];
        for (var i=0; i< dbobj.queryresults.length; ++i) {
            var o = {};
            o.site = dbobj.queryresults[i].site;
            o.apiUrl = "/api/search/"+result.id+"/"+(i+1);
            o.choices = [];
            for (var j=0; j< dbobj.queryresults[i].choices.length; ++j) {
                o.choices[j]={"title": dbobj.queryresults[i].choices[j].title,
                                "artist": dbobj.queryresults[i].choices[j].artist,
                                "url": dbobj.queryresults[i].choices[j].url,
                                "apiUrl": "/api/search/"+result.id+"/"+(i+1)+"/"+(j+1)};
            }
            result.queryresults[i] = o;
        }
        res.toJSON.results = [result];
        res.json(res.toJSON);
    }

    res.makeLyricsRequest(res.dbobj, searchResultsFetchedCallback);
})
.put(function (req, res) {
    //console.log(req.body);
    var updated = [];
    if (req.body.title) {
        res.dbobj.title = req.body.title;
        updated.push("title");
    }
    if (req.body.artist) {
        res.dbobj.artist = req.body.artist;
        updated.push("artist");
    }
    if (req.body.sitemax) {
        res.dbobj.sitemax = Number(req.body.sitemax);
        updated.push("sitemax");
    }

    function searchResultsFetchedCallback(dbobj) {
        //if (req.body.title || req.body.artist)
        dbobj.save(); //async but doesn't matter
        res.toJSON.message = "Updated fields: "+ (updated.length > 0 ? updated.join(", ") : "none");
        res.json(res.toJSON);
    }

    res.makeLyricsRequest(res.dbobj, searchResultsFetchedCallback);
})
.delete(function (req, res) {
    res.dbobj.remove(function(err,dbobj){
        if (err) {
            res.toJSON.message = "Found, but remove error"
        } else {
            res.toJSON.message = "Search item deleted";
        }
        res.json(res.toJSON);
    });
});
router.get("/search/:id/:site", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    if (!dbConnected) {
        toJSON.message = "Database not connected";
        res.json(toJSON);
        return;
    }

    async.waterfall([
        function start(callback) {
            searchQuery.findById(req.params.id, callback);
        }, function makeReturnJSON(dbobj) {
            toJSON.message = "Found";
            var result = {};
            var i=Number(req.params.site)-1;
            result.title = dbobj.title;
            result.artist = dbobj.artist;
            result.id = dbobj.id;
            result.accessdate = dbobj.accessdate;
            result.accessutc = dbobj.accessutc;
            result.site = dbobj.queryresults[i].site;
            
            if (i<dbobj.queryresults.length) {
                choices = [];
                for (var j=0; j< dbobj.queryresults[i].choices.length; ++j) {
                    choices[j]={"title": dbobj.queryresults[i].choices[j].title,
                                    "artist": dbobj.queryresults[i].choices[j].artist,
                                    "url": dbobj.queryresults[i].choices[j].url,
                                    "apiUrl": "/api/search/"+result.id+"/"+(i+1)+"/"+(j+1)};
                }
                result.choices = choices;
            }
            toJSON.results = [result];
            res.json(toJSON);
        }
        ],function (err, dbobj){
            if (err || !dbobj) {
                toJSON.message = "Search item not found";
                res.json(toJSON);
            }
        });
});
router.get("/search/:id/:site/:rank", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    if (!dbConnected) {
        toJSON.message = "Database not connected";
        res.json(toJSON);
        return;
    }
    var finalUrl = null;
    var siteName = null;
    var dbobj = null;
    async.waterfall([
        function start(callback) {
            searchQuery.findById(req.params.id, callback);
        }, function makeReturnJSON(dbobj, callback) {
            toJSON.message = "Found";
            var result = {};
            var i=Number(req.params.site)-1;
            var j=Number(req.params.rank)-1;
            finalUrl = dbobj.queryresults[i].choices[j].url;
            siteName = dbobj.queryresults[i].site;
            toJSON.results = [];
            if (dbConnected)
                lyricData.findOne({"url":finalUrl}, callback);
            else
                callback(null, null);
            //res.json(toJSON);
        }, function next (doc, callback) {
            dbobj = doc;
            if (dbobj) { 
                var result = {};
                for (var field in lyricData.schema.paths) {
                    if (field.charAt(0) !== "_") {
                        result[field] = dbobj[field];
                    }
                }
                result.id = dbobj.id;
                result.apiUrl = "/api/id/"+result.id;

                toJSON.results.push(result);
                res.json(toJSON);
            } else { // http request to query actual lyrics site
                request({
                    uri: finalUrl,
                    method: "GET", 
                    timeout: 10000,
                    followRedirect:true,
                    maxRedirects: 10
                }, callback);
            }
        }, function(resp,html, callback) {
            var $ = cheerio.load(html);
            var customSiteInfo = customSites[siteName];
            var result = customSiteInfo.getSongInfo($); // call custom site scraper
            result.url = finalUrl;
            console.log(customSiteInfo.name+" Lyrics Ready");

            function databaseFinishCallback() {
                if (dbobj) {
                    result.id = dbobj.id;
                    result.apiUrl = "/api/id/"+result.id;
                }
                
                toJSON.results.push(result);
                res.json(toJSON);
            }
            if (!dbConnected) 
                databaseFinishCallback();

            if (!dbobj) { // if database did not have entry, make new entry
                dbobj = new lyricData(result);
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
        }
        ],function (err, dbobj){
            if (err || !dbobj) {
                toJSON.message = "Search item not found";
                res.json(toJSON);
            }
        });
});





router.get("/query", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method,
                    "message": "Invalid, use "+"/api/query/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]"
    };
    res.json(toJSON);

});
router.get("/query/:querystr", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    var queryStr = req.params.querystr;
    toJSON.message = "";
    toJSON.message = scrapSites(queryStr, toJSON) ? "Found" : "Not found";
    if (!dbConnected)
        toJSON.message += ", database not connected"
    
    var now = new Date();
    function waitForAtLeastX () {
        if (toJSON.results.length<toJSON.query.minimum && 
            toJSON.results.length+toJSON.query.failed < toJSON.query.totalsites) {
            // less than minimum BUT ALSO having not all sites scanned

            setTimeout(waitForAtLeastX,200);
        } else {
            if (toJSON.query.format === "json") {
                res.json(toJSON);
            } else {
                res.json(toJSON);
            }
            
        }
    }
    setTimeout(waitForAtLeastX,200);
});
router.route("/id")
    .get(function(req, res) {
        var toJSON = { "request": "/api"+req.url,
                        "method": req.method
        };
        toJSON.message = "Invalid, use /api/id/xxxxxxxxxxxxxxxxxxxxxxxx";
        res.json(toJSON);
    })
    .delete(function(req, res) {
        var toJSON = { "request": "/api"+req.url,
                        "method": req.method
        };
        if (!dbConnected){
            toJSON.message = "Database not connected";
            res.json(toJSON);
        } else {
            lyricData.remove({}, function(err) {
                toJSON.message = "Entire lyrics cache deleted";
                res.json(toJSON);
            });
        }
    });
router.route("/id/:id")
.all(function (req, res, next) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    res.toJSON = toJSON;
    if (!dbConnected) {
        res.toJSON.message = "Database not connected";
        res.json(res.toJSON);
        return;
    } else {
        lyricData.findById(req.params.id, function searchbyIdCallback(err, dbobj) {
            if (err || !dbobj) {
                res.toJSON.message = "Lyrics item not found";
                res.json(res.toJSON);
            } else {
                res.toJSON.message = "Found";
                res.dbobj = dbobj;


                if (Math.abs(new Date(dbobj.accessdate) - new Date()) >= databaseRefreshRate ) { 
                    function lyricURLRequestCallback(err,res,html) { // callback for when the final lyric page loads
                        var $ = cheerio.load(html);
                        var customSiteInfo = customSites[dbobj.source];
                        var result = customSiteInfo.getSongInfo($); // call custom site scraper
                        result.url = dbobj.url;
                        console.log(customSiteInfo.name+" updated lyrics Ready");

                        function databaseFinishCallback() {
                            if (dbobj) {
                                result.id = dbobj.id;
                                result.apiUrl = "/api/id/"+result.id;
                            }
                            next();
                        }
                        // update existing document with newly fetched fields
                        dbobj.update(result,function(err,dobj) {
                            if (err) {
                                console.log("Update Error",err,dbobj);
                                return;
                            }
                            databaseFinishCallback();
                        });//.exec();
                    }
                    request({
                        uri: dbobj.url,
                        method: "GET", 
                        timeout: 10000,
                        followRedirect:true,
                        maxRedirects: 10
                    }, lyricURLRequestCallback);
                } else {
                    next();
                }
            }
        });
    }
})
.get(function (req, res) {;
    var result = {};
    for (var field in lyricData.schema.paths) {
        if (field.charAt(0) !== "_") {
            result[field] = res.dbobj[field];
        }
    }
    result.id = res.dbobj.id;
    result.apiUrl = "/api/id/"+result.id;
    
    res.toJSON.results = [result];
    res.json(res.toJSON);
})
.delete(function (req, res) {
    res.dbobj.remove(function(err,dbobj){
        if (err) {
            res.toJSON.message = "Found, but remove error"
        } else {
            res.toJSON.message = "Lyrics item deleted";
        }
        res.json(res.toJSON);
    });
});

