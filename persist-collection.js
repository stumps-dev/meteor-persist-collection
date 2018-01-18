import localforage from 'localforage'
import { extendPrototype as extendGetItems } from 'localforage-getitems'
import { extendPrototype as extendSetItems } from 'localforage-setitems'

extendGetItems(localforage)
extendSetItems(localforage)

Mongo.Collection.prototype._syncing = new ReactiveVar(false)

Mongo.Collection.prototype.isSyncing = function () {

  return this._syncing.get()
}

Mongo.Collection.prototype.setPersisted = function (data) {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  if (_.isArray(data) || _.isObject(data))
    return store.setItems(data)
  else
    throw new Error('Invalid data argument.')
}

Mongo.Collection.prototype.getPersisted = function (keys) {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  if (_.isString(keys))
    return store.getItem(key)
  else if (_.isArray(keys) || !keys)
    return store.getItems(keys || null)
  else
    throw new Error('Invalid key(s) argument.')
}

Mongo.Collection.prototype.removePersisted = function (keys) {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  if (_.isString(keys))
    return store.removeItem(keys)
  else if (_.isArray(keys))
    return Promise.all(keys.map(key => store.removeItem(key)))
  else
    throw new Error('Invalid key(s) argument.')
}

Mongo.Collection.prototype.clearPersisted = function () {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  return store.clear()
}

Mongo.Collection.prototype.syncPersisted = function () {

  const col = this

  return new Promise((resolve, reject) => {

    col._syncing.set(true)

    const store = localforage.createInstance({
      driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      name: 'persisted_collections',
      storeName: col._name
    })

    const inserted = []
    const updated = []
    const removed = []

    store.getItems().then(pc => {

      for (let key in pc) {

        if (pc.hasOwnProperty(key)) {

          const doc = pc[key]

          if (doc === false)
            removed.push(key)
          else if (doc._insertedOffline && doc._updatedOffline) {

            delete doc._insertedOffline
            delete doc._updatedOffline

            inserted.push(doc)
          } else if (doc._insertedOffline) {

            delete doc._insertedOffline

            inserted.push(doc)
          } else if (doc._updatedOffline) {

            delete doc._updatedOffline

            updated.push(doc)
          }

          if (doc !== false) {

            doc._id = key

            col._collection._docs.set(key, doc)
          }
        }
      }

      _.each(col._collection.queries, query => {

        col._collection._recomputeResults(query)
      })

      col._collection._observeQueue.drain()

      Meteor.defer(() => {

        col._syncing.set(false)
      })

      resolve({ inserted, updated, removed })
    }).catch(reject)
  })
}

Mongo.Collection.prototype.detachPersister = function () {

  if (!this._persister)
    return false

  this._persister._observeHandle.stop()

  delete this._persister
}

Mongo.Collection.prototype.attachPersister = function (selector, options) {

  if (this._persister)
    return false

  const col = this

  col._persister = {}

  const persister = col._persister

  persister._store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: col._name
  })

  persister._observeHandle = col.find(selector || {}, options || {}).observe({
    added (doc) {

      const _id = doc._id
      delete doc._id

      if (!Meteor.status().connected && !col.isSyncing())
        doc._insertedOffline = true

      persister._store.setItem(_id, doc).catch(err => {

        if (err)
          console.error(err)
      })
    },
    changed (doc) {

      const _id = doc._id
      delete doc._id

      if (!Meteor.status().connected && !col.isSyncing())
        doc._updatedOffline = true

      persister._store.setItem(_id, doc).catch(err => {

        if (err)
          console.error(err)
      })
    },
    removed (doc) {

      if (!Meteor.status().connected && !col.isSyncing())
        persister._store.setItem(doc._id, false).catch(err => {

          if (err)
            console.error(err)
        })
    }
  })
}
