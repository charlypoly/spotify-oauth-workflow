import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as methodOverride from 'method-override';
import * as session from 'express-session';
import * as passport from 'passport';
import * as consolidate from 'consolidate';
import { SCOPE_LABELS } from './scopeLabels';

const SpotifyStrategy: any = require('passport-spotify').Strategy;

const PORT = config.server.port;

let spotifyStrategy = new SpotifyStrategy({
    clientID: config.spotify.clientId,
    clientSecret: config.spotify.clientSecret,
    callbackURL: config.spotify.redirectUri,
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      done(null, Object.assign({}, profile));
    });
  }
 );

passport.use(spotifyStrategy);

function userSerializer(user, done) {
  done(null, user);
}
passport.serializeUser(userSerializer);
passport.deserializeUser(userSerializer);

const app = express();
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: config.server.sessionSecret }));
app.use(passport.initialize());
app.use(passport.session());
// assign the swig engine to .html files
app.engine('html', consolidate.handlebars);
// set .html as the default extension
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname,  '../../views'));

// AUTH
app.get('/auth/',
  (req: express.Request, res: express.Response) => {
    res.render('scopesSelection.handlebars.html', { scopes: config.spotify.scopes, labels: SCOPE_LABELS });
  }
);

app.get('/auth/connect',
  (req: express.Request, res: express.Response, next) => {
    req.session.spotifyScopes = req.query.scopes ? Object.keys(req.query.scopes) : config.spotify.scopes;
    return passport.authenticate('spotify', {
      scope: req.session.spotifyScopes
    })(req, res, next);
  },
  (req: express.Request, res: express.Response) => {
    // The request will be redirected to spotify for authentication, so this
    // function will not be called.
  }
);

app.get('/auth/callback',
  passport.authenticate('spotify'),
  (req: express.Request, res: express.Response) => {
    res.redirect('/app');
  }
);

app.get('/auth/logout', (req: express.Request, res: express.Response) => {
  req.logout();
  res.redirect('/');
});

app.get('/',
  (req: express.Request, res: express.Response) => {
    res.render('index.handlebars.html');
  }
);

app.get('/app',
  (req: express.Request, res: express.Response, next) => {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/');
    }
  },
  (req: express.Request, res: express.Response) => {
    res.render('app.handlebars.html', { user: req.user });
  }
);

console.log(`Server listening on port ${PORT}`);
app.listen(PORT);
