import Router from 'koa-router';

const routes = new Router();

console.log('setting up routes')

routes.get('/whoami', function *() {
  if (this.passport.user) {
    this.body = this.passport.user;
  } else {
    this.body = "no one";
  }
});

const privateRoutes = new Router();

privateRoutes.use(function *(next) {
  if (this.passport.user) {
    yield next;
  } else {
    // 401: Unauthorized -- represents authentication error
    response.status = 401;
    response.body = { error: 'not logged in' };
  }
});

routes.use(privateRoutes.routes(), privateRoutes.allowedMethods());

export default routes;
