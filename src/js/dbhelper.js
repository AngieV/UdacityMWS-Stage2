
let fetchedNeighborhoods;
let fetchedCuisines;

/**
 * Common database helper functions.
 */
export default class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`; //`http://localhost:${port}/data/restaurants.json`
  }

  /**
   * API URL
   */
  static get API_URL() {
    const port = 1337; // port where sails server will listen.
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(`${DBHelper.API_URL}/restaurants`)
    .then(response => {
      response.json()
    .then(restaurants => {
      console.log('restaurants.JSON: ', restaurants);
      if (restaurants.length) {
            // Get all neighborhoods from all restaurants
            const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
            // Remove duplicates from neighborhoods
            fetchedNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);

            // Get all cuisines from all restaurants
            const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
            // Remove duplicates from cuisines
            fetchedCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
          }
        callback(null, restaurants);
      });
  }).catch(error => { // Oops!. Got an error from server.
      if (response.status != 200) {
        const error = (`Request failed. Returned ${error}`);
      }
      callback(error, null);
      });
    }

  /**
   * Save a restaurant or array of restaurants into idb, using promises.
   */
   //lines 62-78 by Alexandro Perez
  static putRestaurants(restaurants) {
    if (!restaurants.push) restaurants = [restaurants];
    return this.db.then(db => {
      const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      return Promise.all(restaurants.map(networkRestaurant => {
        //checks if to see if fetched restaurant is already in the idb and if so
        // whether the idb info or the fetched info is more current.
        //if not in idb, or if updated, the restaurant is added/stored
        return store.get(networkRestaurant.id).then(idbRestaurant => {
          if (!idbRestaurant || networkRestaurant.updatedAt > idbRestaurant.updatedAt) {
            return store.put(networkRestaurant);  
          } 
        });
      })).then(function () {
        return store.complete;
      });
    });
  }

  /**
   * Get a restaurant, by its id, or all stored restaurants in idb using promises.
   * If no argument is passed, all restaurants will returned.
   */
   static getRestaurants(id = undefined) {
    return this.db.then(db => {
      const store = db.transaction('restaurants').objectStore('restaurants');
      if (id){
       return store.get(Number(id));
      }
      return store.getAll();
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  // lines 47-58 by Alexandro Perez
  static fetchRestaurantById(id, callback) {
    fetch(`${DBHelper.API_URL}/restaurants/${id}`)
      .then(response => {
      if (!response.ok) 
        return Promise.reject("Restaurant couldn't be fetched from network");
      return response.json();
    }).then(fetchedRestaurant => {
      // if restaurant could be fetched from network:
      //DBHelper.putRestaurants(fetchedRestaurant);
      return callback(null, fetchedRestaurant);
    }).catch(networkError => {
      // if restaurant couldn't be fetched from network:
      console.log(`${networkError}, trying idb.`);
      DBHelper.getRestaurants(id).then(idbRestaurant => {
        if (!idbRestaurant) 
          return callback("Restaurant not found in idb either", null);
        return callback(null, idbRestaurant);
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (!restaurant.photograph && !restaurant.id)
      restaurant.photograph = "na.png";
    return (`/img/${restaurant.photograph||restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(map);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}
