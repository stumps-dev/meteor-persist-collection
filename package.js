Package.describe({
  name: 'stumps:persist-collection',
  version: '1.0.0',
  summary: 'Persist a collection for offline use.',
  git: 'https://github.com/stumpss/meteor-persist-collection',
  documentation: 'README.md'
})

Package.onUse(function(api) {

  api.use([
    'underscore',
    'ecmascript',
    'reactive-var',
  ])

  api.addFiles('persist-collection.js', 'client')

  Npm.depends({
    localforage: 'git+https://github.com/localForage/localForage.git',
    'localforage-getitems': 'git+https://github.com/localForage/localForage-getItems.git',
    'localforage-setitems': 'git+https://github.com/localForage/localForage-setItems.git'
  })
})
