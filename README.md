# lyricScraper


Built using `Node.js`, with `mongoDB` as the backend database and `mongoose` to interface with it, 
`request` and `cheerio` extra `npm` packages for fetching and scraping pages. 
Done as a weekend project to learn some backend tech.

####Features and Things
* Searches `genius.com`, `songlyrics.com`, `lyricsmode.com` for lyrics, and returns the first hit in JSON form
* Only works on static sites now, (no AngularJS sites)
* Saves lyrics to the server's local "lyricScraper" mongoDB database
* CRUD (Create-Read-Update-Delete) for queries
* Port `22096`

####How to Get It Up and Running
* Tried only on Arch Linux x64, but theres no reason why it wouldn't work elsewhere
* Need `mongodb` (obviously), and (atleast for me) navigate to a directory and `mkdir data && mongod --dbpath data`
* Install dependencies with `npm install` if you clone this repo and navigate into the directory, otherwise the dependencies are listed in `package.json`
* Run: `node lyricScraper.js`

####Commands
* `/` for friendly instructions like the ones below :D
* `/deleteall` to wipe
* `/search/artist/[artist-name]/title/[song-name]/format/[filetype,default=json]/usecache/[yes|no,default=yes]/store[yes|no,default=yes]/minimum/[number of results]` to request new lyrics



