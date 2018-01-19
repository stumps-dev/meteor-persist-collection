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

  return store.setItems(data)
}

Mongo.Collection.prototype.getPersisted = function (ids) {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  if (_.isString(ids))
    return store.getItem(ids)
  else if (_.isArray(ids) || !ids)
    return store.getItems(ids || null)
  else
    throw new Error('Invalid id(\'s) argument.')
}

Mongo.Collection.prototype.removePersisted = function (ids) {

  const store = localforage.createInstance({
    driver: [localforage.WEBSQL, localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    name: 'persisted_collections',
    storeName: this._name
  })

  if (_.isString(ids))
    return store.removeItem(ids)
  else if (_.isArray(ids))
    return Promise.all(ids.map(id => store.removeItem(id)))
  else
    throw new Error('Invalid id(\'s) argument.')
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

Mongo.Collection.prototype.detachPersisters = function (ids) {

  const persisters = this._persisters

  let removeIds = []

  if (_.isString(ids))
    removeIds.push(ids)
  else if (_.isArray(ids))
    removeIds = ids
  else if (ids)
    throw new Error('Invalid id(\'s) argument.')

  if (!ids)
    for (let id in persisters) {

      if (persisters.hasOwnProperty(id)) {

        const persister = persisters[id]

        persister._observeHandle.stop()

        delete this._persisters[id]
      }
    }
  else
    removeIds.forEach(id => {

      const persister = persisters[id]

      persister._observeHandle.stop()

      delete this._persisters[id]
    })
}

Mongo.Collection.prototype.attachPersister = function (selector, options) {

  const col = this

  if (!col._persisters)
    col._persisters = {}

  const persisterId = Random.id()
  const persister = {}

  col._persisters[persisterId] = persister

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

  return persisterId
}
