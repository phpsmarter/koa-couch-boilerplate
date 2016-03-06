export default {
  todoActions: {
    '_design/lookup': {
      version: 1,
      views: {
        byUserAndTimestamp: {
          map: `function (doc) {
            if (doc.user && doc.ts) emit([doc.user, doc.ts], doc._id);
          }`,
        },
      },
    },
  },
  users: {
    '_design/lookup': {
      version: 0,
      views: {
        byForeignProviderAndId: {
          map: `function (doc) {
            Object.keys(doc.foreignProfiles).forEach(function(provider) {
              doc.foreignProfiles[provider].forEach(function(profile) {
                emit([provider, profile.id], doc._id);
              });
            });
          }`,
        },
      },
    },
  },
};
