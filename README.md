# lyricScraper

lyricScraper is a RESTful Node.js based server API backed by a database 
that fetches lyrics for given song artist and title on online sites, and caches the results. 
The user can then access individual results through an ID or by various means (by Artist, Title, etc).

It is built using `Node.js` using the `async` library, `Express.js` for routing, 
`mongoDB` as the backend database through `mongoose`, 
`request` and `cheerio` packages for fetching and scraping pages. 
Done as a weekend project to learn some backend and JS web framework tech.

####Features and Things
* Searches `genius.com`, `songlyrics.com`, `lyricsmode.com` for lyrics, and returns the first hit in JSON form
* Only works on static sites now, (no AngularJS sites)
* Saves lyrics to the server's local "lyricScraper" mongoDB database
* CRUD (Create-Read-Update-Delete) for queries
* Port `22096`

####How to Get It Up and Running
* Tried only on Arch Linux x64, but theres no reason why it wouldn't work elsewhere
* Need `mongodb` (obviously), and (atleast for me) navigate to a new directory and `mkdir data && mongod --dbpath data`
* Install dependencies with `npm install` if you clone this repo and navigate into its directory, otherwise the dependencies are listed in `package.json`
* Run: `node lyricScraper.js`

####Commands
* GET `/api` for friendly instructions like the ones below :D
* GET `/api/search/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]` to request new lyrics, will respond with data + database ID
* POST `/api/search` to create a custom search, will return new `/api/search/id/xxxxxxxxxxxxxxxxxxxxxxxx/`
* GET `/api/search/id/xxxxxxxxxxxxxxxxxxxxxxxx` to display search item's current parameters (artist, title) and any results
* PUT `/api/search/id/xxxxxxxxxxxxxxxxxxxxxxxx` with parameters to update search parameters (artist, title)
* DELETE `/api/search/id/xxxxxxxxxxxxxxxxxxxxxxxx` will delete the search query
* GET `/api/id/xxxxxxxxxxxxxxxxxxxxxxxx` to look up cached lyrics by ID
* DELETE `/api/id/xxxxxxxxxxxxxxxxxxxxxxxx` to delete cached lyrics by ID
* DELETE `/api/id` to wipe cache clean



