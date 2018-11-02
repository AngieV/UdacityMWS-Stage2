import idb from "idb";

// ================ OPEN DATABASE ===================

const dbPromise = {db: idb.open( "rest_reviews_db", 1, upgradeDb => {
  switch(upgradeDb.oldVersion) {
    // Note: don't use 'break' in this switch statement,
    // the fall-through behaviour is what we want.
    case 0:// executes when the database is first created
      upgradeDb.createObjectStore('restaurants', {keypath: 'id'});
    case 1:
      //createObectstore (method) returns a promise for the database,
      //containing objectStore 'restaurants' which uses id as its key
      const storeReviews = upgradeDb.createObjectStore('reviews', {keypath: 'id'}); 
      storeReviews.createIndex("restaurant_id", "restaurant_id");
    } //end switch
  }), //end DBPromise 
  /**
   * Save a restaurant or array of restaurants into idb, using promises.
   */
   //lines 22-51 by Alexandro Perez
  putRestaurants(restaurants) {
    if (!restaurants.push) restaurants = [restaurants];
    return this.db.then(db => {
      const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      Promise.all(restaurants.map(networkRestaurant => {
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
  },

   /**
   * Get a restaurant, by its id, or all stored restaurants in idb using promises.
   * If no argument is passed, all restaurants will returned.
   */
  getRestaurants(id = undefined) {
    return this.db.then(db => {
      const store = db.transaction('restaurants').objectStore('restaurants');
      if (id) return store.get(Number(id));
      return store.getAll();
    });
  },

};

export default dbPromise;