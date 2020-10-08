# lyricScraper

lyricScraper is an AngularJS web app and RESTful Node.js based server API backed by a database 
that fetches lyrics for given song artist and title on online sites, and caches the results. 
The user can then access individual results through an ID or by various means (by Artist, Title, etc).

![Screenshot1](lyricscraper.png?raw=true)


Experimental version is up on Heroku in the link listed in the repo description. 
It uses 1 Dyno for now.

It is built using `Node.js` using the `async` library, `Express` for routing, 
`mongoDB` as the backend database through `mongoose`, 
`request` and `cheerio` packages for fetching and scraping pages. 
The web front-end was made using `AngularJS`.
Done as a weekend project to learn some backend and JS web framework tech.

#### Features and Things
* Searches `genius.com`, `songlyrics.com`, `lyricsmode.com` for lyrics, and returns the first hit in JSON form
* Works on static sites, (no AngularJS sites)
* Caches lyrics to the server's local "lyricScraper" mongoDB database
* RESTful CRUD (Create-Read-Update-Delete) for queries implemented using HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`)
* Port `22096`

#### How to Get It Up and Running
* Tried only on Arch Linux x64, but theres no reason why it wouldn't work elsewhere
* Need `mongodb` (obviously), and (atleast for me) navigate to a new directory and `mkdir data && mongod --dbpath data`
* Install dependencies with `npm install` if you clone this repo and navigate into its directory, otherwise the dependencies are listed in `package.json`
* Run: `node lyricScraper.js`

#### Web Interface
* Go to the `/` directory on the hosted domain

#### Commands
* GET `/api` for friendly instructions like the ones below :D
* GET `/api/query/artist=[name]&title=[name]&format=[extension,default=json]&minimum=[number of results]` to request new lyrics, will respond with data and unique lookup ID, multiple words are separated with `+`
* POST `/api/search` to create a custom search (optional: with parameters as data), will return URL of new resource: `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx`
* DELETE `/api/search` to wipe all search resources clean
* GET `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx` to display search item's current parameters (artist, title) and sites and their results
* PUT `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx` with data to update search parameters (artist, title)
* DELETE `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx` will delete the search query
* GET `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx/x` to display a particular site's search results
* GET `/api/search/xxxxxxxxxxxxxxxxxxxxxxxx/x/x` to display a particular site's individual search result, will return unique ID to look up using the format below
* GET `/api/id/xxxxxxxxxxxxxxxxxxxxxxxx` to look up cached lyrics by ID
* DELETE `/api/id/xxxxxxxxxxxxxxxxxxxxxxxx` to delete cached lyrics by ID
* DELETE `/api/id` to wipe cache clean



