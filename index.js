'use strict'

const leftPad = require('left-pad')
const EventEmitter = require('events')
const polygoat = require('polygoat')

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
      /**
      * @param {object} event
      * @param {object} user
      * @param {function} [callback]
      * @return {Promise} if uses without callback
      */
      add (event, user, callback) {
        event._id = id + '-' + leftPad(events.length, 8, 0)
        event.resourceId = id
        event.index = events.length
        event.createdAt = new Date()
        event.user = user

        return polygoat((done) => {
          pouchdb.post(event)
            .then((result) => {
              events.push(event)
              done(null, {
                ok: true,
                id: id,
                index: event.index
              })
            })
            .catch(done)
        }, callback)
      }
    }
  }

  const updateViewModel = (db, reducer, event) => {
    if (event.index === 0) {
      const newState = reducer({
        _id: event.resourceId,
        createdAt: event.createdAt,
        createdBy: event.user,
        lastModifiedAt: event.createdAt,
        lastModifiedBy: event.user
      }, event)

      db.post(newState)
        .then((result) => eventEmitter.emit('created', result))
        .catch((error) => eventEmitter.emit('error', error))
    } else {
      db.get(event.resourceId)
        .then((state) => reducer(state, event))
        .then((newState) => {
          newState.lastModifiedAt = event.createdAt
          newState.lastModifiedBy = event.user

          return db.put(newState)
        })
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
    /**
    * @param {string} eventType
    * @param {function} eventFunc
    */
    on (eventType, eventFunc) {
      return eventEmitter.on(eventType, eventFunc)
    },
    /**
    * @param {string} id
    * @param {function} [callback]
    * @return {Promise} if uses without callback
    */
    get (id, callback) {
      return polygoat((done) => {
        pouchdb.allDocs({
          startkey: id + '-',
          endkey: id + '-99999999',
          include_docs: true},
          (error, result) => {
            if (error) return done(error)
            if (result.rows.length === 0) {
              return done({
                status: 404,
                name: 'not_found',
                message: 'missing',
                error: true,
                reason: 'missing'
              })
            }
            done(null, eventStore(id, result.rows.map(row => row.doc)))
          })
      }, callback)
    },

    /**
    * @param {function} [callback]
    * @return {Promise} if uses without callback
    */
    create (callback) {
      return polygoat((done) => {
        idGenerator.next()
          .then((id) => done(null, eventStore(id.toString(), [])))
          .catch(done)
      }, callback)
    },

    /**
    * @param {string} id
    * @param {function} [callback]
    * @return {Promise} if uses without callback
    */
    createWithId (id, callback) {
      return polygoat((done) => {
        done(null, eventStore(id.toString(), []))
      })
    }
  }
}
