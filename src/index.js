import 'babel-polyfill';

import co from 'co';
import koa from 'koa';
import session from 'koa-session-redis';
import logger from 'koa-logger2';
import passport from 'koa-passport';
import Router from 'koa-router';

import authRoutes from './auth';
import routes from './routes';
import { setUpUserDb } from './users';

// Pull all our config information from the environment.
const {
  PORT = 3000,
  SESSION_KEY = '675be993-1089-439c-a5f9-fb078bc734d0',
  REDIS_HOST = '127.0.0.1',
  REDIS_PORT = 6379,
  REDIS_TTL = 3600,
  LOGGING_FORMAT = 'ip [day/month/year:time zone] "method url protocol/httpVer" '
    + 'status size "referer" "userAgent" duration ms custom[unpacked]',
} = process.env;

const app = koa();

const logMiddleware = logger(LOGGING_FORMAT);
app.use(logMiddleware.gen);

app.keys = [ SESSION_KEY ];
app.use(session({
  store: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ttl: REDIS_TTL,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Create a Router for all our routes. This is in case you do not wish to run your app
// at your server's root; e.g. make all paths start with `/apps/foobar`.
const mainRouter = new Router();

mainRouter.use(authRoutes.routes())
  .use(authRoutes.allowedMethods());

mainRouter.use(routes.routes())
  .use(routes.allowedMethods());

app.use(mainRouter.routes())
  .use(mainRouter.allowedMethods());

co(function *() {
  yield [
    // If you wish to perform other operations here, e.g. `ensureDesignDocs('businessLogicDB')`,
    // add more generator functions to this array and they are guaranteed to run before the web
    // server starts.
    setUpUserDb(),
  ];
  app.listen(PORT, () => console.log(`Listening on localhost:${PORT}`));
}).catch(err => console.error(err));
