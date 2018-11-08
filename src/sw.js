import idb from "idb";

let cacheID = "mws_rrdb" + "-v 1.2";

let urlsToCache = [ '/',
                   '/index.html',
                   '/restaurant.html',
                   '/css/styles.css',
                   '/js/main.js',
                   '/js/restaurant_info.js',
                   '/manifest.json'
                 ];

// ============ INSTALL SERVICEWORKER ===============

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheID).then(cache => {
      console.log(`Opened ${cacheID} cache`);
        return cache.addAll(urlsToCache)
    .catch(error => {
      console.log("Caches open failed: " + error);
    });
  }));
});

// ================ OPEN DATABASE ===================

const dbPromise = idb.open("rest_reviews_db", 2, upgradeDb => {
  switch(upgradeDb.oldVersion) {
    // Note: don't use 'break' in this switch statement,
    // the fall-through behaviour is what we want.
    case 0: 
      { // executes when the database is first created
          upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      }
    case 1: 
      {
      //createObectstore (method) returns a promise for the database,
      //containing objectStore 'restaurants' which uses id as its key
      const storeReviews = upgradeDb.createObjectStore('reviews', {keyPath: 'id'}); 
      storeReviews.createIndex("restaurant_id", "restaurant_id");
      }
    } //end switch
  })

// ================ LISTEN FOR REQUEST ===================

self.addEventListener('fetch', event => {
  let requestCache = event.request;
  let cacheUrl = new URL(event.request.url);
  if (event.request.url.indexOf("restaurant.html") >= 0) {  
    const RestaurantCacheURL = "restaurant.html";
    requestCache = new Request(RestaurantCacheURL);
  }
// Requests to the API are handled separately from others
// lines 39-47 ~ Doug Brown
  const checkURL = new URL(event.request.url);
  if(checkURL.port == 1337) { // === "1337"  ??
      const parts = checkURL.pathname.split("/");
      let id = checkURL.searchParams.get("restaurant_id") - 0;
      if(!id) {
        if (checkURL.pathname.indexOf("restaurants")) {
          id = parts[parts.length - 1] === "restaurants" ? "-1": parts[parts.length - 1];
        } else {
          id = checkURL.searchParams.get("restaurant_id");
        }
      }
      readDatabase_AJAX(event, id);
    } else {  //Requests going to the API get handled separately
      handleRequest(event, requestCache);
    }
  });

  function readDatabase_AJAX(event, id) {
    // Only use caching for GET events
    if (event.request.method !== "GET") {
      return fetch(event.request)
        .then(fetchResponse => fetchResponse.json())
        .then(json => {
          return json
        });
    }
    // Check IndexedDB for JSON, return if available; 
    event.respondWith(dbPromise.then(db => {
      console.log("sw got dbPromise");
      //create a transaction and pass objectStore(s)
      let tx = db.transaction("restaurants"); //transaction is a property
      // call objectStore and pass the name of the objectStore
      let store = tx.objectStore("restaurants");
      return store.get('id'); // D Brown: return db.transaction("restaurants").objectStore("restaurants").get("id");
    }).then(data => {
      //lines 73-75  ~D Brown
        return ( (data && data.data) || fetch(event.request)
          .then(fetchResponse => fetchResponse.json())
          .then(json => {
            console.log("sw got json");
            //save the JSON data to the IDB
            return dbPromise.then(db => {
              let tx = db.transaction("restaurants", "readwrite");
              let store = tx.objectStore('restaurants').put({
                id: id,
                data: json
              });
              console.log("sw put data in db: ", json);
              return json;
            }); // dbPromise.then(db => {
          }) // .then(json => {
        ); // return ( (data && ...
      }) //fulfills then(data => {... })
      .then(finalresponse => {
        return new Response (JSON.stringify(finalResponse));
      })
      .catch(error => {
        return new Response("Error fetching data: ", { status: 500 });
      })
    ) //fulfill Promise : event.respondWith(dbPromise.then(db => {
  } // end

    function handleRequest(event, requestCache) {
    // Check for previously cached html-if available, return;
    // If not available, fetch, cache & return the request
    event.respondWith(
      caches.match(requestCache).then(response => { 
        if (response) {
          return response;
        } else {
          // IMPORTANT: Clone the request. A request is a stream and
          // can only be consumed once. Since we are consuming this
          // once by cache and once by the browser for fetch, we need
          // to clone the response.
          console.log("doing fetch since not in cache");
          const fetchRequest = event.request.clone();
          return fetch(fetchRequest).then(fetchResponse => {
            //Check if we received a valid response
            if(!fetchResponse || fetchResponse.status !== 200) {
              return new Response("No internet connection", { 
                status: 404, 
                statusText: "No internet connection"
              });
            } else {
              return caches.open(cacheID).then(cache => {
                if (fetchResponse.url.indexOf("restaurants.html") === -1) {
                  // IMPORTANT: Clone the response
                  const cacheResponse = fetchResponse.clone()
                  cache.put(event.request, cacheResponse);
              }
              return fetchResponse;
            });
            }
          }).catch(error => {
            // handle lack of jpg
            if (event.request.url.indexOf(".jpg") >= 0) {
                return caches.match("/img/na.png");
              } else {
                return new Response("Item not found", {
                status: 404,
                statusText: error
                });
              }
            }) //end catch
        }  //end else
      })); //end respond with...
    } //end handleReq