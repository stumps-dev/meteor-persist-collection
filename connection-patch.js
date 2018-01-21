// Fix for nonsense errors
// With great thanks to Mitar
// https://github.com/mitar

const allCollections = {}

const Connection = Meteor.connection.constructor;

// We patch registerStore to intercept messages and modify them to not throw errors.
const originalRegisterStore = Connection.prototype.registerStore;
Connection.prototype.registerStore = function(name, wrappedStore) {
  const originalUpdate = wrappedStore.update;
  wrappedStore.update = function(msg) {
    const collection = allCollections[name];

    // We might still not have a collection for packages defining collections before
    // this package is loaded. But this is OK because those are packages which do not
    // use this package on their collections. If you want to use this package on your
    // collections you have to anyway define a dependency on it.
    if (!collection) { return originalUpdate.call(this, msg); }

    const mongoId = MongoID.idParse(msg.id);
    const doc = collection.findOne(mongoId);

    // If a document is being added, but already exists, just change it.
    if ((msg.msg === 'added') && doc) {
      msg.msg = 'changed';
    // If a document is being removed, but it is already removed, do not do anything.
    } else if ((msg.msg === 'removed') && !doc) {
      return;
    // If a document is being changed, but it does not yet exist, just add it.
    } else if ((msg.msg === 'changed') && !doc) {
      msg.msg = 'added';

      // We do not want to pass on fields marked for clearing.
      for (let field in msg.fields) {
        const value = msg.fields[field];
        if (value === undefined) {
          delete msg.fields[field];
        }
      }
    }

    return originalUpdate.call(this, msg);
  };

  return originalRegisterStore.call(this, name, wrappedStore);
};

// We misuse defineMutationMethods to hook into the Mongo.Collection
// constructor and retrieve collection's instance.
const originalDefineMutationMethods = Mongo.Collection.prototype._defineMutationMethods;
Mongo.Collection.prototype._defineMutationMethods = function() {
  if (this._connection && this._connection.registerStore) {
    allCollections[this._name] = this._collection;
  }

  return originalDefineMutationMethods.call(this);
};
