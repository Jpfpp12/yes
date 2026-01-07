import { createServer } from '../server/index';
import serverless from 'serverless-http';

const app = createServer();

export const config = {
    api: {
        bodyParser: false,
    },
};

export const handler = serverless(app);
