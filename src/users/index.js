import uuid from 'uuid';
import loadDb, { ensureDesignDocs } from '../db';

const userDb = loadDb('users');
const userEventDb = loadDb('userEvents');

// ## `*setUpUserDb()`
//
// Make sure the design docs are in place for the users DB.
export function *setUpUserDb() {
  yield [
    ensureDesignDocs('users'),
    ensureDesignDocs('userEvents'),
  ];
}

// ## `*getUserById(_id, safe)`
//
// Look up a user in the database by ID. If `safe` is false,
// this will throw if the user isn't found; if `safe` is
// true, it will simply return `null`.
export function *getUserById(_id, safe = false) {
  try {
    return yield userDb.get(_id);
  } catch (err) {
    if (err.status === 404) {
      if (safe) {
        return null;
      } else {
        throw new Error(`No user found with ID of ${_id}`);
      }
      throw err;
    }
  }
}

// ## `*getOrCreateUserByForeignProfile(profile)`
//
// Given a [foreign profile](http://passportjs.org/docs/profile),
// either find the described user in the database, or create an
// entry for them if we haven't seen them yet.
export function *getOrCreateUserByForeignProfile(profile) {
  const user = yield getUserByForeignProfile(profile);
  if (user) return user;
  return yield createUserByForeignProfile(profile);
}

// ## `*getUserByForeignProfile(profile)`
//
// Given a [foreign profile](http://passportjs.org/docs/profile),
// find the described user in the database. Return `null` if not
// found.
export function *getUserByForeignProfile(profile) {
  const { id, provider } = profile;
  try {
    const queryResults = yield userDb.query('lookup/byForeignProviderAndId', {
      key: [ provider, id ],
    });
    const _id = (queryResults.rows[0] || {}).value;
    if (!_id) return null;
    return yield userDb.get(_id);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

// ## `*createUserByForeignProfile(profile)`
//
// Given a [foreign profile](http://passportjs.org/docs/profile),
// create a database entry for the represented user.
export function *createUserByForeignProfile(profile) {
  const { id, provider, displayName } = profile;
  const user = {
    _id: uuid.v1(),
    displayName,
    foreignProfiles: {
      [ provider ]: [ { ...profile } ],
    },
  };
  yield [
    userDb.put(user),
    userEventDb.post({
      type: 'user/create',
      user: user._id,
      foreignProfile: profile,
    }),
  ];
  return user;
}

// ## `*addForeignProfileToUser(_id, profile)`
//
// Given a user ID and a [foreign profile](http://passportjs.org/docs/profile),
// connect the foreign profile to the passed user's account.
export function *addForeignProfileToUser(_id, profile) {
  // Try to find the user. If the user does not exist, this will throw, and
  // the ensuing error will be tossed up to our caller.
  const user = yield getUserById(_id);

  // Get a list of the profiles the user already has from the given provider.
  const profilesFromSameProvider = user.foreignProfiles[profile.provider];

  // Scan the linked profiles and make sure we don't already have a connection.
  if (profilesFromSameProvider && profilesFromSameProvider.some(p => p.id === profile.id)) {
    return;
  }

  // Create a copy of the user's info with the new profile added.
  const newUser = {
    ...user,
    displayName: user.displayName || profile.displayName,
    foreignProfiles: {
      ...user.foreignProfiles,
      [profile.provider]: [
        ...user.foreignProfiles[profile.provider],
        profile,
      ],
    },
  };

  // Save the user's record, and log the event.
  yield [
    userDb.put(user),
    userEventDb.post({
      type: 'user/connect-account',
      user: user._id,
      foreignProfile: profile,
    }),
  ];

  // We don't really need to return anything, but it may be useful to return the user's new
  // profile.
  return newUser;
}
