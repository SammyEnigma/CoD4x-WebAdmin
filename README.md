# CoD4x-WebAdmin

A Real Time Application for CoD4x Game Servers built using Node.js, Express, Mongoose, Socket.io, Passport & MongoDB.

## Demo
Check [Demo](https://www.cirkus-serveri.com/)

## Features

+ Uses Express as the application Framework.
+ Manages Sessions using [express-session](https://github.com/expressjs/session) package.
+ Authenticates via username and password using [Passport](https://github.com/jaredhanson/passport).
+ Passwords are hashed using [bcrypt-nodejs](https://github.com/shaneGirish/bcrypt-nodejs) package.
+ Social Authentication via Facebook, Google+, Steam and Twitter using [Passport](https://github.com/jaredhanson/passport).
+ Real-time communication between a client and a server using [Socket.io](https://github.com/socketio/socket.io).
+ Uses [MongoDB](https://github.com/mongodb/mongo), [Mongoose](https://github.com/Automattic/mongoose) and [MongoLab(mLab)](https://mlab.com/) for storing and querying data.
+ Stores session in a [MongoDB](https://github.com/mongodb/mongo) using [connect-mongo](https://github.com/kcbanner/connect-mongo); a MongoDB-based session store.
