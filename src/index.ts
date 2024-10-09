import { Server, Socket } from 'socket.io';
import { decodeJWT, decodeNextAuth, getToken } from './utils';
import { createServer } from 'http';
import { EV } from './config';
import readline from 'readline';

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
    },
});

const subscribers = new Set();
let serverAlreadySubscribed = false;

io.use(async (socket, next) => {
    try {
        const token = getToken(socket);
        const cookie = socket.handshake.headers.cookie;

        const decoded = cookie ? await decodeNextAuth(token) : decodeJWT(token);
        decoded && next();

        next();
    } catch (error) {
        console.error('Unauthorized access: ', socket.id);
        next(new Error('Unauthorized access'));
    }
});

io.on(EV.CONNECTION, async (socket: Socket) => {
    const client = socket.handshake.headers.cookie;

    if (client) {
        const token = getToken(socket);
        const decoded = await decodeNextAuth(token);
        const clientId = decoded?.sub;

        if (!clientId) {
            socket.disconnect();
            return;
        }

        socket.on('disconnect', async () => {
            if (subscribers.has(clientId)) {
                subscribers.delete(clientId);
                console.log('Unsubscribed:', clientId);
            }
        });

        socket.on(EV.SUBSCRIBE, async () => {
            try {
                subscribers.add(decoded.sub);
                socket.join(clientId);
                console.log('Subscribed:', clientId);
            } catch (error) {
                console.error('Error subscribing:', socket.id);
                return;
            }
        });

        socket.on(EV.UNSUBSCRIBE, async () => {
            try {
                if (subscribers.has(clientId)) {
                    subscribers.delete(clientId);
                    socket.disconnect();
                    console.log('Unsubscribed:', clientId);
                }
            } catch (error) {
                console.error('Error unsubscribing:', socket.id);
                return;
            }
        });
    } else {
        if (serverAlreadySubscribed) return;
        serverAlreadySubscribed = true;

        socket.on(EV.NOTIFY, id => {
            const listens = subscribers.has(id);
            if (listens) {
                console.log('Notifying:', id);
                socket.to(id).emit('notification');
            }
        });
    }
});

httpServer.listen(process.env.PORT);
console.log('Server listening on port:', process.env.PORT);

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (_, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    } else if (key.name === 'space') {
        console.log('Current subscribers:', Array.from(subscribers));
    }
});
