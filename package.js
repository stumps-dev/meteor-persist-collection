Package.describe({
  name: 'stumps:persist-collection',
  version: '1.1.0',
  summary: 'Persist a collection for offline use.',
  git: 'https://github.com/stumpss/meteor-persist-collection',
  documentation: 'README.md'
})

Package.onUse(function(api) {

  api.use([
    'underscore@1.0.0',
    'ecmascript@0.1.3',
    'mongo@1.0.4',
    'reactive-var@1.0.1',
    'random@1.0.0'
  ])

  api.addFiles('persist-collection.js', 'client')

  Npm.depends({
    localforage: 'git+https://github.com/localForage/localForage.git#master',
    'localforage-getitems': 'git+https://github.com/localForage/localForage-getItems.git#master',
    'localforage-setitems': 'git+https://github.com/localForage/localForage-setItems.git#master'
  })
})
