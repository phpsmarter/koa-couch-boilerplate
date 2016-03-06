import path from 'path';
import PouchDB from 'pouchdb';
import url from 'url';

import designDocs from './designDocs';

const dbs = {};

const DB_LOCATION = (() => {
  if (!process.env.DB_LOCATION) {
    throw new Error(`Need to specify DB_LOCATION in environment variables`);
  }
  return process.env.DB_LOCATION;
})();

export default function loadDb(database) {
  if (dbs[database]) return dbs[database];
  if (/^https?:/.test(database)) {
    return (dbs[database] = new PouchDB(url.resolve(DB_LOCATION, database)));
  }
  return (dbs[database] = new PouchDB(path.join(DB_LOCATION, database)));
}

export function *ensureDesignDocs(database) {
  const db = loadDb(database);
  const design = designDocs[database];
  if (!design) return;
  for (var docId in design) {
    if (!design.hasOwnProperty(docId)) continue;
    const newDesign = design[docId];
    newDesign._id = docId;
    try {
      const oldDesign = yield db.get(docId);
      if (oldDesign.version >= newDesign.version) continue;
      if (oldDesign) {
        newDesign._rev = oldDesign._rev;
      }
      yield db.put(newDesign);
    } catch (err) {
      yield db.put(newDesign);
    }
  }
}
