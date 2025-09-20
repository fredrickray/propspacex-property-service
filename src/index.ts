import Server from './server';
import DotenvConfig from '@config/dotenv.config';
const app = new Server();

app.start(DotenvConfig.serverPort);
