import PapiService from './service'
import axios from 'axios'

const Papi = class {
  constructor (args) {
    if (!args) {
      throw new Error('Missing API configuration.')
    }

    if (!args.base) {
      throw new Error('Missing API Base URL.')
    }

    this.hookLocations = {
      failedAuthSetup: PapiService.prototype
    }

    this.hookStack = {}

    for (const hookName in this.hookLocations) {
      if (this.hookLocations.hasOwnProperty(hookName)) {
        this.hookStack[hookName] = []
      }
    }

    this._base = args.base

    if (args.services && Array.isArray(args.services)) {
      for (const service of args.services) {
        this.registerService(service)
      }
    }

    if (args.headers && Array.isArray(args.headers)) {
      for (const i in args.headers) {
        if (args.headers.hasOwnProperty(i)) {
          const header = args.headers[i]

          axios.defaults.headers.common[header[0]] = header[1]
        }
      }
    }

    if (args.authSetup && typeof args.authSetup === 'function') {
      this.registerAuthSetup(args.authSetup)
    }
  }

  registerAuthSetup (authCallback) {
    if (typeof authCallback !== 'function') {
      throw new Error('Papi tried to register an authentication method but couldn\'t find a callback function.')
    }

    this.auth = authCallback
    PapiService.prototype.auth = authCallback
    PapiService.prototype.callAuthSetup = (service, endpoint) => PapiService.prototype.auth(this, service, endpoint)
  }

  registerHook (hookName, hookCallback) {
    if (!hookName) {
      throw new Error('Papi tried to register a new hook but is missing the hook name.')
    }

    if (typeof hookName !== 'string') {
      throw new Error('Papi tried to register a new hook but the name passed wasn\'t a string.')
    }

    if (!hookCallback) {
      throw new Error('Papi tried to register a new hook but is missing a callback.')
    }

    if (typeof hookCallback !== 'function') {
      throw new Error('Papi tried to register a new hook but the callback given wasn\'t a function.')
    }

    if (this.hookLocations[hookName]) {
      this.hookStack[hookName].push(this.hookLocations[hookName][hookName])
      this.hookLocations[hookName][hookName] = hookCallback
    } else {
      throw new Error(`Papi couldn't find a hook with the name of ${hookName}.`)
    }
  }

  deregisterHook (hookName) {
    if (!hookName) {
      throw new Error('Papi tried to deregister a hook but is missing the hook name.')
    }

    if (typeof hookName !== 'string') {
      throw new Error('Papi tried to deregister a hook but the name given wasn\'t a string.')
    }

    if (typeof this.hookLocations[hookName] === 'undefined') {
      throw new Error(`Papi tried to deregister the hook ${hookName} but it doesn't look like it exists.`)
    }

    const previousHook = this.hookStack[hookName].pop()
    this.hookLocations[hookName][hookName] = previousHook
  }

  registerService (args) {
    if (!args) {
      throw new Error('Missing service configuration.')
    }

    const options = (typeof args === 'string') ? { name: args } : args

    if (!options.name) {
      throw new Error('Missing service name.')
    }

    if (!options.base) {
      options.base = options.name
    }

    if (!options.base.startsWith('/')) {
      options.base = '/' + options.base
    }

    options.endpoints = options.endpoints || []
    options.services = options.services || []
    options.base = this._base + options.base

    if (!this[options.name]) {
      this[options.name] = new PapiService(options)
    } else {
      throw new Error(`Service ${options.name} is already registered.`)
    }

    if (options.methods && typeof options.methods === 'object') {
      for (const methodName in options.methods) {
        if (options.methods.hasOwnProperty(methodName)) {
          const method = options.methods[methodName]

          this[options.name][methodName] = method
        }
      }
    }
  }
}

export default Papi
