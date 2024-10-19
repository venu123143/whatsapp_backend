export const runtime = 'edge'
import app from "../dist/index.js"

// import { Hono } from 'hono'
import { handle } from '@hono/node-server/vercel'
import type { PageConfig } from 'next'

export const config: PageConfig = {
    api: {
        bodyParser: false,
    },
}


export default handle(app.app as any)