import {
    APP_BASE_URL,
    SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET
} from '../../lib/env';
import type {
    Express,
    RequestHandler
} from 'express';
import {
    Issuer,
    Strategy
} from 'openid-client';
import type {
    TokenSet,
    UserinfoResponse
} from 'openid-client';
import User from '../../service/User';
import {logDebug} from '../../lib/log';
import passport from 'passport';
import sessionCookie from 'cookie-session';


const DISCOVER_INFO_ENDPOINT = 'https://slack.com/.well-known/openid-configuration';
const REDIRECT_URL = `${APP_BASE_URL}/auth/slack/callback`;

const registerAuthentication = (app: Express): void => {

    // @see http://expressjs.com/en/resources/middleware/cookie-session.html
    app.use(
        sessionCookie({
            keys: ['keyboard cat'],
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    // handles serialization and deserialization of authenticated user
    passport.serializeUser((authUser: Partial<{sub: string}>, done) => {
        void User.load({slackUserId: authUser.sub}).then((user) => {
            done(null, {
                id: user?.id,
                sid: user?.slackUserId,
                fn: user?.displayName,
            });
        });
    });
    passport.deserializeUser((authUser: Express.User, done) => {
        done(null, authUser);
    });

    // start authentication request
    app.get('/auth/slack', (req, res, next) => {
        const {sid} = req.user as Partial<{sid: string}>;

        if (sid) {
            res.redirect('/');
            return;
        }

        (passport.authenticate(
            'oidc',
            {
                scope: ['openid', 'email', 'profile']
            }
        ) as RequestHandler)(req, res, next);
    });

    // authentication callback
    app.get('/auth/slack/callback',
        passport.authenticate(
            'oidc',
            {
                successRedirect: '/',
                failureRedirect: '/'
            }
        ) as RequestHandler
    );

    void Issuer.discover(DISCOVER_INFO_ENDPOINT)
        .then(slackIssuer => {
            const client = new slackIssuer.Client({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                redirect_uris: [ REDIRECT_URL ],
                post_logout_redirect_uris: [ APP_BASE_URL ],
            });

            passport.use(
                'oidc',
                new Strategy({client}, (tokenSet: TokenSet, userinfo: UserinfoResponse, done: (err?: unknown, user?: Express.User) => void) => {
                    logDebug('passport verify', userinfo);
                    done(null, tokenSet.claims());
                })
            );
        });
};

export default registerAuthentication;
