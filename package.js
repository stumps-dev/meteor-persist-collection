Package.describe({
  name: 'stumps:persist-collection',
  version: '1.1.2',
  summary: 'Persist a collection for offline use.',
  git: 'https://github.com/stumpss/meteor-persist-collection',
  documentation: 'README.md'
})

Package.onUse(function (api) {

  api.use([
    'underscore@1.0.0',
    'ecmascript@0.1.3',
    'mongo@1.0.4',
    'mongo-id@1.0.1',
    'reactive-var@1.0.1'
  ])

  api.addFiles([
    'connection-patch.js',
    'persist-collection.js'
  ], 'client')

  Npm.depends({
    'localforage': '1.5.6',
    'localforage-getitems': '1.4.1',
    'localforage-setitems': '1.4.0'
  })
})
