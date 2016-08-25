pouchdb-event-store
======
mimimal eventStore on top of pouchdb

[![bitHound Overall Score](https://www.bithound.io/github/stockulus/pouchdb-event-store/badges/score.svg)](https://www.bithound.io/github/stockulus/pouchdb-event-store) [![npm Package](https://img.shields.io/npm/dm/pouchdb-event-store.svg)](https://www.npmjs.com/package/pouchdb-event-store) [![travis-ci.org](https://travis-ci.org/stockulus/pouchdb-event-store.svg)](https://travis-ci.org/stockulus/pouchdb-event-store) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![license](https://img.shields.io/npm/l/pouchdb-event-store.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)

### Usage

```bash
npm i pouchdb-event-store
```

```js
const PouchDB = require('pouchdb') // or pouchdb-node / pouchdb-browser / pouchdb-react-native
const pouchdbEventStore = require('pouchdb-event-store')

let lastId = 0
const options = {
  pouchdb: new PouchDB('events'),
  idGenerator: {
    next () { return new Promise((resolve, reject) => { resolve(lastId++) }) }
  },
  viewModels: [
    {
      pouchdb: new PouchDB('viewModel'),
      reducer (state, event) {
        if (!state.items) state.items = []
        state.items.push(event)
        return state
      }
    }
  ]
}

const eventStoreFactory = pouchdbEventStore(options)
eventStoreFactory.create()
  .then((eventStore) => eventStore.add({type: 'CREATE'}, 123))
  .then((result) => {
    console.log(result)
  })
  .catch((error) => console.error(error))

eventStoreFactory.get('1')
  .then((eventStore) => {
    console.log(eventStore.getEvents())
  })
  .catch((error) => console.error(error))

// or callback style
eventStoreFactory(options).create((error, eventStore) => {
  if (error) return console.error(error)
  eventStore.add({type: 'CREATE'}, 123, (error, result) => {
    if (error) return console.error(error)
    console.log(result)
  })
})

eventStoreFactory.get('2', (error, eventStore) => {
  if (error) return console.error(error)
  console.log(eventStore.getEvents())
})

```

---
[![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&maxAge=2592000)](https://twitter.com/stockulus) [![GitHub stars](https://img.shields.io/github/stars/stockulus/pouchdb-event-store.svg?style=social&label=Star)](https://github.com/stockulus/pouchdb-event-store)
