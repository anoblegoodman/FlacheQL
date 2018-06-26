import cleanQuery from "./helpers/cleanQuery";
import constructQueryChildren from "./helpers/constructQueryChildren";
import constructResponsePath from "./helpers/constructResponsePath";
import createCallbacksForPartialQueryValidation from "./helpers/createCallbacksForPartialQueryValidation";
import denormalize from "./helpers/denormalize";
import flatten from "./helpers/flatten";
export default class Flache {
  // TODO: have these parameters set-up on initialization rather than on each query
  constructor(endpoint, headers = { "Content-Type": "application/graphql" }, options) {
    this.cache = {};
    this.queryCache = {};
    this.fieldsCache = [];
    this.cacheLength = 0;
    this.cacheExpiration = 1000 * 120;
    this.cbs;
    this.endpoint = endpoint;
    this.options = options;
    this.headers = headers;
  }

  /**
   * Saves all Flache data to browser session storage for cache persistence. Purges after 200 seconds.
   */
  saveToSessionStorage() {
    Object.keys(this).forEach(key =>
      sessionStorage.setItem(key, JSON.stringify(this[key]))
    );
    setTimeout(() => sessionStorage.clear(), 200000);
  }

  /**
   * Grabs any relevant Flache data from browser session storage.
   */
  readFromSessionStorage() {
    Object.keys(this).forEach(key => {
      if (sessionStorage.getItem(key))
        this[key] = JSON.parse(sessionStorage.getItem(key));
    });
  }

  it(query, variables) {
    // console.log('variables', variables)
    // console.log('headers', this.headers)
    // console.log('options', this.options)
    // console.log('endpoint', this.endpoint)
    
    // create a key to store the payloads in the cache
    const stringifiedQuery = JSON.stringify(query);
    // console.log('fetching:', stringifiedQuery)
    // return this.fetchData(query, this.endpoint, this.headers, stringifiedQuery)
    this.queryParams = cleanQuery(query);

    // create a children array to check params
    this.children = constructQueryChildren(query);

    // if an identical query comes in return the cached result
    if (this.cache[stringifiedQuery]) {
      return new Promise(resolve => {
        console.log("resolving from cache");
        resolve(this.cache[stringifiedQuery]);
      });
    }

    // set boolean to check for partial queries, else skip straight to fetchData and return
    if (!this.options.paramRetrieval || !this.options.fieldRetrieval) return this.fetchData(query, stringifiedQuery);

    // returns an object of callback functions that check query validity using subset options
    if (!this.cbs) {
      this.cbs = createCallbacksForPartialQueryValidation(this.options.subsets);
    }

    // create a boolean to check if all queries are subsets of others
    let allParamsPass = false;

    // increment cache length
    this.cacheLength = Object.keys(this.cache).length;
    // if the developer specifies in App.jsx
    if (this.options.paramRetrieval) {
      let childrenMatch = false;
      //check if query children match
      childrenMatch = this.fieldsCache.some(obj => {
        let objChildren = Object.values(obj)[0].children;
        return (
          objChildren.every(child => this.children.includes(child)) &&
          this.children.every(child => objChildren.includes(child))
        );
      });

      // no need to run partial query check on first query
      if (childrenMatch) {
        if (this.cacheLength > 0) {
          let currentMatchedQuery;
          for (let key in variables) {
            for (let query in this.queryCache[key]) {
              // console.log('thing', this.cbs)
              // console.log('thing', this.options.subsets)
              // console.log('thing', this.options.subsets[key])
              if (
                this.cbs[this.options.subsets[key]](
                  variables[key],
                  this.queryCache[key][query]
                )
              ) {
                // if the callback returns true, set the currentMatchedQuery to be the current query
                currentMatchedQuery = query;
              } else {
                // continue;
              }
    
            }
          }
        }
      }
    }
    
    Object.keys(variables).forEach(queryVariable => {
      // if a key already exists on the query cache for that variable add a new key value pair to it, else create a new obj
      if (this.queryCache[queryVariable]) {
        this.queryCache[queryVariable][stringifiedQuery] =
          variables[queryVariable];
      } else
        this.queryCache[queryVariable] = {
          [stringifiedQuery]: variables[queryVariable]
        };
    });

    if (this.options.fieldRetrieval) {
      let filtered;
      let foundMatch = false;
      this.fieldsCache.forEach(node => {
        if (node.hasOwnProperty(this.queryParams)) {
          foundMatch = this.children.every(child => {
            return node[this.queryParams].children.includes(child);
          });
          if (foundMatch) {
            filtered = JSON.parse(JSON.stringify(node[this.queryParams].data));
            for (let key in filtered) {
              if (!this.children.some(child => key.includes(child))) {
                delete filtered[key];
              }
            }
          }
        }
      });

      if (foundMatch) {
        return new Promise(resolve => {
          filtered = denormalize(filtered);
          resolve(filtered);
        });
      }

    } else {
      //if partial retrieval is off, return cached object or fetchData
      if (this.cache[stringifiedQuery]) {
        return new Promise(resolve => {
          return resolve(this.cache[stringifiedQuery]);
        });
      } else {
        return this.fetchData(query, this.endpoint, this.headers, stringifiedQuery);
      }
    }
    // console.log('cache', this.cache)
    // console.log('fieldscache', this.fieldsCache)
    // console.log('querycache', this.queryCache)
    return this.fetchData(query, this.endpoint, this.headers, stringifiedQuery);
    
  }

  fetchData(query, endpoint, headers, stringifiedQuery) {
    // console.log('query', query)
    // console.log('headers', headers)
    // console.log('endpoint', endpoint)
    return new Promise((resolve, reject) => {
      fetch(endpoint, {
        method: "POST",
        headers,
        body: query
      })
      .then(res => {
        // console.log('resres,',res)
        return res.json()})
      .then(res => {
        // console.log('getting res from fetch:', res)  
        this.cache[stringifiedQuery] = res;
        // console.log('THIS IS query params,', this.queryParams)
        let normalizedData = flatten(res);
        // console.log('THIS IS normalized data', flatten(res))
          this.fieldsCache.push({
            [this.queryParams]: {
              data: normalizedData,
              children: constructQueryChildren(query)
            }
          });
          setTimeout(
            () => delete this.cache[stringifiedQuery],
            this.cacheExpiration
          );
          resolve(res);
          if (this.options.resultsVariable) {
            // ADD PROPERTY ON QUERY IN CACHE TO INDICATE WHETHER NUMBER OF RETURNED RESULTS IS GREATER THAN MAX
          }
        })
        .catch(err => err);
    });
  }
}
