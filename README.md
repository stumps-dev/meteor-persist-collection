# What is this?
This package will enable your app to persist a collection in the browser storage!
It's still experimental but it runs fine for now.

To be fair, this runs ALOT faster than GroundDB.
## Features
- Super easy to setup
- You can keep using Mongo collections like you want
- Remembers changes made offline (for server sync)
##### Uses the localStorage drivers in the following order:
- WebSQL
- IndexedDB
- localStorage
## usage
#### Persisting
###### *Collection.js (client)*
```js
const Collection = Mongo.Collection('collection')

Collection.attachPersister([selector], [options])
```
Your collection will now be persisted in the browser storage. Yes it's as easy as that!
#### Synchronizing
```js
Collection.syncPersister()

// Returns (only used for server synchronization):
{
  inserted: [
    {...doc},
    {...doc},
    ...
  ],
  updated: [
    {...doc},
    {...doc},
    ...
  ],
  removed: [
    '_id1',
    '_id2',
    ...
  ]
}
```
This function will synchronize your persisted collection with the Mongo collection.
The return value consists of documents which have been inserted/updated/removed while the app was offline. This could be used to synchronize with the server collection.
> note:
Meteor.status().connected MUST be false when editing your collection offline, otherwise changes wont be returned by this function.
#### Detect synchronization
```js
Collection.isSyncing()

// Returns: ReactiveVar (boolean)
```
## Migration helpers
#### Set persisted documents
```js
Collection.setPersisted(data)

// Returns: Promise
// You can pass an array with the key-value pairs:
const data = [
  { key: 'some id1', value: {...doc} },
  { key: 'some id2', value: {...doc} },
  { key: '...', value: ... }
]

// Or you can pass a object with the keys as properties:
const data = {
  'some id1': {...doc},
  'some id2': {...doc},
  '...': ...
}
```
#### Get persisted documents
```js
Collection.getPersisted(keys or key)

// Pass null or no argument to get all documents or pass an array of keys or just a key.
// Returns: Promise
```
#### Remove persisted documents
```js
Collection.getPersisted(keys or key)

// Returns: Promise
// Pass either an array of keys or just a key.
```
#### Clear persisted collection
```js
Collection.clearPersisted()

// Returns: Promise
```
