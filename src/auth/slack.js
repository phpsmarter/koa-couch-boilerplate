// Visit `https://api.slack.com/applications` to create a token.
import passport from 'koa-passport';
import { Strategy as SlackStrategy } from 'passport-slack';
import co from 'co';
import url from 'url';

import { SERVER_HOST } from './util';
import { getOrCreateUserByForeignProfile, addForeignProfileToUser } from '../users';

const CALLBACK_URL = url.resolve(SERVER_HOST, '/auth/slack/callback');

passport.use(new FacebookStrategy({
  clientID: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
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
