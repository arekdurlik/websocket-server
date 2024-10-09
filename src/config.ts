export enum EV {
    CONNECTION = 'connection',
    NOTIFY = 'n', // bigger payloads don't go through, probably some vercel thing
    SUBSCRIBE = 'subscribe',
    UNSUBSCRIBE = 'unsubscribe',
}
