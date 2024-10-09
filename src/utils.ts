import { verify } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { parse } from 'cookie-es';
import { decode } from 'next-auth/jwt';

export function getToken(socket: Socket) {
    const cookie = socket.handshake.headers.cookie || '';
    const cookies = parse(cookie || '');
    let token = cookies['next-auth.session-token'];

    if (!token) {
        if (typeof socket.handshake.query.token === 'string') {
            token = socket.handshake.query.token;
        }
    }

    if (!token) throw new Error();

    return token;
}

export function decodeJWT(token: string) {
    const decoded = verify(token, process.env.NEXTAUTH_SECRET ?? '');

    return decoded;
}

export async function decodeNextAuth(token: string) {
    const decoded = await decode({
        token,
        secret: process.env.NEXTAUTH_SECRET ?? '',
    });

    return decoded;
}
