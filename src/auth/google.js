import passport from 'koa-passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import co from 'co';
import url from 'url';

import { SERVER_HOST } from './util';
import { getOrCreateUserByForeignProfile } from '../users';

const CALLBACK_URL = url.resolve(SERVER_HOST, '/auth/google/callback');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: CALLBACK_URL,
  passReqToCallback: true,
}, (req, token, tokenSecret, profile, done) => co(function *() {
  if (!req.user) {
    // User is trying to either log in or create an account.
    return done(null, yield getOrCreateUserByForeignProfile(profile));
  } else {
    // User is already logged in and would like to connect another provider account.
    return done(null, yield addForeignProfileToUser(req.user._id, profile));
  }
}).catch(err => done(err))));
