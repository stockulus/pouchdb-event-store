'use strict'

const test = require('tape')
const fs = require('fs')
const del = require('del')
const idGeneratorFactory = require('seq-id-generator')
const pouchdb = require('pouchdb')
  .defaults({prefix: '/tmp/eventStore/'})

const eventStoreFactory = require('../index')

del.sync(['/tmp/eventStore'], {force: true})
fs.mkdirSync('/tmp/eventStore')

test('create new', (assert) => {
  idGeneratorFactory('/tmp/eventStore/id.txt')
    .then((idGenerator) => {
      const options = {
        pouchdb: pouchdb('events'),
        idGenerator: idGenerator,
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

      return eventStoreFactory(options).create()
    })
    .then((eventStore) => eventStore.add({type: 'CREATE'}, 123))
    .then((result) => {
      assert.equal(result.id, '1')
      assert.end()
    })
    .catch((error) => assert.error(error))
})
