const chai = require('chai')
const expect = chai.expect
const papi = require('../dist/main')
const http = require('http')
const PORT = 4567
const DEFAULT_BASE_URL = `http://localhost:${PORT}`

let api;
let server;

describe('Core Functionality', () => {
    beforeEach(() => {
        let hookStack = (typeof api !== 'undefined') ? api.hookStack : false
        api = papi({base: DEFAULT_BASE_URL});

        if (hookStack && api) {
          api.hookStack = hookStack;
        }
    });

    describe('New instance', () => {
        // Successes
        it('Creates a new instance when given a base url', (done) => {
            expect(api).to.haveOwnProperty('_base');
            expect(api._base).to.equal(DEFAULT_BASE_URL);
            done();
        });
        it('Creates a new instance with default headers in an array', (done) => {
          api = papi({
            base: DEFAULT_BASE_URL,
            headers: [
              ['header', 'value']
            ],
            services: [
              'base'
            ]
          });

          server = http.createServer((req, res) => {
            res.setHeader('Content-Type', 'application/json;charset=utf-8');
            expect(req.headers['header']).to.equal('value');
            res.end(); 
          }).listen(PORT, () => {
            api.base.get().then(response => {
              done();
            });
          });
        })
        it('Creates a new instance with services as objects', (done) => {
            const apiWithServices = papi({
                base: 'mybase',
                services: [
                    {
                        name: 'custom'
                    }
                ]
            });

            expect(apiWithServices).to.haveOwnProperty('_base');
            expect(apiWithServices._base).to.equal('mybase');

            expect(apiWithServices).to.haveOwnProperty('custom');

            expect(apiWithServices.custom).to.haveOwnProperty('get');
            expect(apiWithServices.custom.get).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('create');
            expect(apiWithServices.custom.create).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('update');
            expect(apiWithServices.custom.update).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('delete');
            expect(apiWithServices.custom.delete).to.be.a('function');

            done();
        });
        it('Creates a new instance with services as strings', (done) => {
            const apiWithServices = papi({
                base: 'mybase',
                services: [
                  'custom'
                ]
            });

            expect(apiWithServices).to.haveOwnProperty('_base');
            expect(apiWithServices._base).to.equal('mybase');

            expect(apiWithServices).to.haveOwnProperty('custom');

            expect(apiWithServices.custom).to.haveOwnProperty('get');
            expect(apiWithServices.custom.get).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('create');
            expect(apiWithServices.custom.create).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('update');
            expect(apiWithServices.custom.update).to.be.a('function');

            expect(apiWithServices.custom).to.haveOwnProperty('delete');
            expect(apiWithServices.custom.delete).to.be.a('function');

            done();
        });
        it('Creates a new instance with an authentication callback', (done) => {
          const apiWithAuth = papi({
            base: 'mybase',
            authSetup: () => { return 'test' }
          });

          expect(apiWithAuth.auth()).to.equal('test');
          done();
        })

        // Failures
        it('Fails when called without arguments', (done) => {
            expect(() => {
                const newApi = papi();
            }).to.throw('Missing API configuration.');
            done();
        });
        it('Fails when called without base', (done) => {
            expect(() => {
                const newApi = papi({});
            }).to.throw('Missing API Base URL.');
            done();
        });
    });

    describe('Functionality', () => {
      // Successes
      it('Registers an authentication callback after being instantiated', (done) => {
        api.registerAuthSetup(() => 'test');

        expect(api.auth()).to.equal('test');

        api.registerAuthSetup(() => true)

        done();
      })
      it('Regsiters a hook', (done) => {
        api.registerService('test');
        api.registerHook('failedAuthSetup', () => 'test');

        expect(api.test.failedAuthSetup).to.be.a('function');
        expect(api.test.failedAuthSetup()).to.equal('test');

        done();
      });
      it('Deregisters a hook', (done) => {
        api.registerService('test');

        api.deregisterHook('failedAuthSetup');

        expect(api.test.failedAuthSetup).to.be.a('function');

        expect(() => {
          api.test.failedAuthSetup();
        }).to.throw('Papi wasn\'t able to setup authentication for the requested call.');
        done();
      });
      it('Calls the hook PapiService.failedAuthSetup', (done) => {
        api.registerAuthSetup(() => false);
        api.registerService('test');

        expect(() => {
          console.log(api.test.get());
        }).to.throw('Papi wasn\'t able to setup authentication for the requested call.');

        api.registerAuthSetup(() => true);
        done();
      })

      // Failures
      it('Fails to register an authentication callback if being passed anything that isn\'t a function.', (done) => {
        expect(() => {
          api.registerAuthSetup('string')
        }).to.throw('Papi tried to register an authentication method but couldn\'t find a callback function.');
        expect(() => {
          api.registerAuthSetup(1)
        }).to.throw('Papi tried to register an authentication method but couldn\'t find a callback function.');
        expect(() => {
          api.registerAuthSetup(true)
        }).to.throw('Papi tried to register an authentication method but couldn\'t find a callback function.');
        expect(() => {
          api.registerAuthSetup([])
        }).to.throw('Papi tried to register an authentication method but couldn\'t find a callback function.');
        expect(() => {
          api.registerAuthSetup({})
        }).to.throw('Papi tried to register an authentication method but couldn\'t find a callback function.');

        done();
      })
      it('Fails to register a hook that doesn\'t exist', (done) => {
        api.registerService('test');

        expect(() => {
          api.registerHook('badHook', () => 'test');
        }).to.throw('Papi couldn\'t find a hook with the name of badHook.');

        done();
      });
      it('Fails to register a hook when the name is missing', (done) => {
        api.registerService('test');

        expect(() => {
          api.registerHook();
        }).to.throw('Papi tried to register a new hook but is missing the hook name.');

        expect(() => {
          api.registerHook(null, () => true);
        }).to.throw('Papi tried to register a new hook but is missing the hook name.');

        done();
      });
      it('Fails to register a hook when passing a name that isn\'t a string', (done) => {

        expect(() => {
          api.registerHook(1, () => 'test');
        }).to.throw('Papi tried to register a new hook but the name passed wasn\'t a string.');

        expect(() => {
          api.registerHook(true, () => 'test');
        }).to.throw('Papi tried to register a new hook but the name passed wasn\'t a string.');

        expect(() => {
          api.registerHook([], () => 'test');
        }).to.throw('Papi tried to register a new hook but the name passed wasn\'t a string.');

        expect(() => {
          api.registerHook({}, () => 'test');
        }).to.throw('Papi tried to register a new hook but the name passed wasn\'t a string.');

        expect(() => {
          api.registerHook(() => true, () => 'test');
        }).to.throw('Papi tried to register a new hook but the name passed wasn\'t a string.');

        done();
      });
      it('Fails to register a hook when the callback is missing', (done) => {
        api.registerService('test');

        expect(() => {
          api.registerHook('test');
        }).to.throw('Papi tried to register a new hook but is missing a callback.');

        expect(() => {
          api.registerHook('test', null);
        }).to.throw('Papi tried to register a new hook but is missing a callback.');

        done();
      });
      it('Fails to register a hook when passing a callback that isn\'t a function', (done) => {

        expect(() => {
          api.registerHook('test', 'string');
        }).to.throw('Papi tried to register a new hook but the callback given wasn\'t a function.');

        expect(() => {
          api.registerHook('test', 1);
        }).to.throw('Papi tried to register a new hook but the callback given wasn\'t a function.');

        expect(() => {
          api.registerHook('test', true);
        }).to.throw('Papi tried to register a new hook but the callback given wasn\'t a function.');

        expect(() => {
          api.registerHook('test', []);
        }).to.throw('Papi tried to register a new hook but the callback given wasn\'t a function.');

        expect(() => {
          api.registerHook('test', {});
        }).to.throw('Papi tried to register a new hook but the callback given wasn\'t a function.');

        done();
      });
      it('Fails to register a hook when the name is missing', (done) => {
        api.registerService('test');

        expect(() => {
          api.deregisterHook();
        }).to.throw('Papi tried to deregister a hook but is missing the hook name.');

        expect(() => {
          api.deregisterHook(null);
        }).to.throw('Papi tried to deregister a hook but is missing the hook name.');

        done();
      });
      it('Fails to register a hook when passing a name that isn\'t a string', (done) => {

        expect(() => {
          api.deregisterHook(1);
        }).to.throw('Papi tried to deregister a hook but the name given wasn\'t a string.');

        expect(() => {
          api.deregisterHook(true);
        }).to.throw('Papi tried to deregister a hook but the name given wasn\'t a string.');

        expect(() => {
          api.deregisterHook([]);
        }).to.throw('Papi tried to deregister a hook but the name given wasn\'t a string.');

        expect(() => {
          api.deregisterHook({});
        }).to.throw('Papi tried to deregister a hook but the name given wasn\'t a string.');

        expect(() => {
          api.deregisterHook(() => true);
        }).to.throw('Papi tried to deregister a hook but the name given wasn\'t a string.');

        done();
      });
      it('Fails to deregister a hook that isn\'t registered', (done) => {
        expect(() => {
          api.deregisterHook('badHook');
        }).to.throw('Papi tried to deregister the hook badHook but it doesn\'t look like it exists');

        done();
      });
    });
});
