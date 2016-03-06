import co from 'co';
import passport from 'koa-passport';
import Router from 'koa-router';

import { getUserById } from '../users';


// Place provider details into a hash so we can keep things DRY across multiple providers.
const PROVIDER_DETAILS = {
  facebook: {
    requiredEnvVars: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET', 'SERVER_HOST'],
  },
  google: {
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SERVER_HOST'],
  },
  slack: {
    requiredEnvVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET', 'SERVER_HOST'],
  }
};

// All authorization-related functions will be under the `/auth` path.
const authRoutes = new Router({
  prefix: '/auth',
});

// Describe to Passport how to serialize a user (grab the user's ID) and
// deserialize a user (look up the user in the DB based on their ID).
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser((id, done) => co(function *() {
  try {
    done(null, yield getUserById(id, true));
  } catch (err) {
    done(err);
  }
}));

// Loop through the providers listed in `PROVIDER_DETAILS`...
Object.keys(PROVIDER_DETAILS)
// ...only looking at ones for which we've supplied the necessary info...
.filter(k => PROVIDER_DETAILS[k].requiredEnvVars.every(
  envvar => process.env[envvar]
// ...and then load the necessary routes.
)).forEach(provider => {
  require(`./${provider}`);

  // Initial URL to which the site directs a user wishing to log in or connect.
  authRoutes.get(`/${provider}`, passport.authenticate(provider));

  // Callback URL to which the OAuth provider sends the user after authorization.
  authRoutes.get(`/${provider}/callback`, passport.authenticate(provider, {
    successRedirect: '/',
    failureRedirect: '/',
  }));
});

// Allow the user to logout by hitting `/auth/logout`.
authRoutes.get('/logout', function *() {
  this.logout();
  this.redirect('/');
});

export default authRoutes;
