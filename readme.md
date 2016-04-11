# event store on top of pouchdb

mimimal eventStore on top of pouchdb

## install
npm i pouchdb-event-store

## test
npm test

```js
const pouchdb = require('pouchdb')
const pouchdbEventStore = require('pouchdb-event-store')

let lastId = 0
const options = {
  pouchdb: pouchdb('events'),
  idGenerator: {
    next () { return new Promise((resolve, reject) => { resolve(lastId++) }) }
  },
  viewModels: [
    {
      pouchdb: pouchdb('viewModel'),
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

```

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
