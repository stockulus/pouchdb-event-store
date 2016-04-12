'use strict'

const _ = require('lodash')
const leftPad = require('left-pad')
const EventEmitter = require('events')

/**
 * Factory function for the event store
 * @param {object} options
 * @param {object} options.pouchdb - pouchdb the events got stored
 * @param {object} options.idGenerator - id generator for new resources
 * @param {function} options.idGenerator.next - the next function
 * @param {object[]} options.viewModels - Array of viewModels {pouchdb, reducer}
 */
module.exports = function eventStoreFactory (options) {
  const pouchdb = options.pouchdb
  const idGenerator = options.idGenerator
  const viewModels = options.viewModels || []

  const eventEmitter = new EventEmitter()

  const eventStore = (id, events) => {
    return {
      getId () { return id },
      getEvents () { return events },
      getETag () { return id + '-' + events.length },
      add (event, user) {
        event._id = id + '-' + leftPad(events.length, 8, 0)
        event.resourceId = id
        event.index = events.length
        event.createdAt = new Date()
        event.user = user

        return new Promise((resolve, reject) => {
          pouchdb.post(event)
            .then((result) => {
              events.push(event)
              resolve({
                ok: true,
                id: id
              })
            })
            .catch(reject)
        })
      }
    }
  }

  const updateViewModel = (db, reducer, event) => {
    if (event.index === 0) {
      const newState = reducer({
        _id: event.resourceId,
        createdAt: event.createdAt,
        createdBy: event.user
      }, event)

      db.post(newState)
        .then((result) => eventEmitter.emit('created', result))
        .catch((error) => eventEmitter.emit('error', error))
    } else {
      db.get(event.resourceId)
        .then((state) => reducer(state, event))
        .then((newState) => db.put(newState))
        .then((result) => eventEmitter.emit('updated', result))
        .catch((error) => eventEmitter.emit('error', error))
    }
  }

  pouchdb.changes({
    since: 'now',
    live: true,
    include_docs: true
  }).on('change', (change) => {
    viewModels.forEach((viewModel) => {
      updateViewModel(viewModel.pouchdb, viewModel.reducer, change.doc)
    })
  })

  return {
    on (eventType, eventFunc) {
      return eventEmitter.on(eventType, eventFunc)
    },
    get (id) {
      return new Promise((resolve, reject) => {
        pouchdb.allDocs({
          startkey: id + '-',
          endkey: id + '-99999999',
          include_docs: true})
          .then((result) => {
            if (result.rows.length === 0) {
              return reject({
                status: 404,
                name: 'not_found',
                message: 'missing',
                error: true,
                reason: 'missing'
              })
            }
            resolve(eventStore(id, _.map(result.rows, (row) => row.doc)))
          })
          .catch(reject)
      })
    },
    create () {
      return new Promise((resolve, reject) => {
        idGenerator.next()
          .then((id) => resolve(eventStore(id.toString(), [])))
          .catch(reject)
      })
    }
  }
}
