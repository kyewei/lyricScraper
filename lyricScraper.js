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

app.use("/api", router);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
app.listen(port);
app.set('json spaces', 4);


var db = mongoose.connection;

var dbConnected = true;
db.on("error", function(err) {
    if (err) {
        dbConnected = false;
    }
});
db.once("open", function() {
});


// Database is named lyricScraper
// Suggested that the database be stored in a working directory
mongoose.connect("mongodb://localhost/lyricScraper");

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
geniusSiteOptions.getLyricLink = function ($) {
    var links = $("li.search_result a");
    var titles = $("li.search_result a .song_title");
    var artists = $("li.search_result a .primary_artist_name");
    if (links.length === 0 || titles.length === 0 || artists.length === 0)
        return;
    var result = [];
    for (var i=0; i < 5; ++i) {
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
    var links = $("div.serpresult h3 a");
    var info = $("div.serpresult .serpdesc-2 a");
    if (links.length === 0 || info.length === 0)
        return;
    var result = [];
    for (var i=0; i < 5; ++i) {
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

/*var metrolyricsSiteOptions = {};
// metrolyrics.com
// from /search/artist/maroon+5/title/she+will+be+loved/format/json/usecache/yes/store/yes/minimum/2
// to
// http://www.metrolyrics.com/search.html?search=maroon+5+she+will+be+loved+
metrolyricsSiteOptions.name = "metrolyrics.com";
metrolyricsSiteOptions.getLyricLink = function ($) {
    var lucky = $("div.songs div.content ul li a");
    console.log(lucky);
    if (!lucky || !lucky[0] || !lucky[0].attribs || !lucky[0].attribs.href)
        return;
    var link = lucky["0"].attribs.href;
    return link;
};
metrolyricsSiteOptions.buildSearchURL = function(obj) {
    var searchURL = "http://www.metrolyrics.com/search.html?search=";
    searchURL += obj.query.artist ? obj.query.artist + "+": "";
    searchURL += obj.query.title ? obj.query.title + "+": "";
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
    var info = $("table a.search_highlight");
    if (info.length === 0)
        return;
    var result = [];
    for (var i=0; i < 5; ++i) {
        if (info[2*i]) {
            result.push({"title": $(info[2*i]).text(),
                            "artist": $(info[2*i+1]).text().split("lyrics")[0].trim(),
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
    //setTimeout(scrapeCustomSite,5,obj,metrolyricsSiteOptions);
    setTimeout(scrapeCustomSite,5,obj,lyricsModeSiteOptions);


    //setTimeout(scrapeSongLyricsDotCom,5,obj);
    return obj;
};

function scrapeCustomSite(obj, customSiteInfo) {
    
    var searchURL = customSiteInfo.buildSearchURL(obj);

    
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
            var urlArr = customSiteInfo.getLyricLink($); // call custom site scraper
            if (!urlArr || urlArr.length === 0) {
                console.log("Error scraping link from "+customSiteInfo.name);
                // decrement max amount of sites that can be displayed since sites found nothing.
                ++obj.query.failed;
                return;
            }
            //console.log(urlArr);

            finalURL = urlArr[0].url;
            console.log("Lyric URL is:",finalURL);

            // tries to see if an existing query exists
            if (dbConnected)
                lyricData.findOne({"url":finalURL}, callback);
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
                result.links = {};
                result.links.href = "/api/id/"+result.id;

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
                    result.links.href = "/api/id/"+result.id;
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
    toJSON.message = "Welcome to the lryicScraper REST JSON API";
    toJSON.next = {};
    toJSON.next.search = { "href": "/api/search/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]",
                            "example": "/api/search/artist=maroon+5&title=she+will+be+loved&format=json&minimum=2",
                            "acceptedMethods": ["GET"]
    };
    toJSON.next.id = { "href": "/api/id/xxxxxxxxxxxxxxxxxxxxxxxx",
                        "example": "/api/id/553ea91f0c8580681ea30bdc",
                        "acceptedMethods": ["GET", "DELETE"]
    };
    res.json(toJSON);
});

router.get("/search", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method,
                    "message": "Invalid, use "+"/api/search/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]"
    };
    res.json(toJSON);

});
router.post("/search", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    var dbobj = new searchQuery({"title":null, "artist":null}).save(function (err,dbobj) {
        if (err) {
            console.log("Create Error",err,dbobj);
            return;
        }
        toJSON.message = "New search created at: "+"/api/search/id/"+dbobj.id;
        res.json(toJSON);
    });
});
router.route("/search/id")
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
router.route("/search/id/:id")
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
    searchQuery.findById(req.params.id, function searchbyIdCallback (err, dbobj) {
        if (err || !dbobj) {
            res.toJSON.message = "Search item not found";
            res.json(res.toJSON);
        } else {
            res.dbobj = dbobj;
            next();
        }
    });
})
.get(function (req, res) {
    var result = {};
    for (var field in searchQuery.schema.paths) {
        if (field.charAt(0) !== "_") {
            result[field] = res.dbobj[field];
        }
    }
    result.id = res.dbobj.id;
    result.links = {};
    result.links.href = "/api/search/id/"+result.id;
    
    res.toJSON.results = [result];
    res.json(res.toJSON);
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
    if (req.body.title || req.body.artist)
        res.dbobj.save();
    res.toJSON.message = "Updated fields: "+ (updated.length > 0 ? updated.join(", ") : "none");
    res.json(res.toJSON);
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





router.get("/search/query/:query", function (req, res) {
    var toJSON = { "request": "/api"+req.url,
                    "method": req.method
    };
    var queryStr = req.params.query;
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
                res.dbobj = dbobj;
                next();
            }
        });
        
    }
})
.get(function (req, res) {
    var result = {};
    for (var field in lyricData.schema.paths) {
        if (field.charAt(0) !== "_") {
            result[field] = res.dbobj[field];
        }
    }
    result.id = res.dbobj.id;
    result.links = {};
    result.links.href = "/api/id/"+result.id;
    
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

